"use client";

import { useState, useRef, useEffect } from "react";
import { zodResolver } from "@hookform/resolvers/zod";
import { Button, buttonVariants } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useForm, useFieldArray, useWatch, type FieldErrors } from "react-hook-form";
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { AlertCircle, FileArchive, Loader2, RotateCcw, Trash2, Upload, X } from "lucide-react";
import { FormValues, formSchema } from "@/schema/vehicle";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import CustomFileUpload from "@/components/ui/customFileUpload";
import JSZip from "jszip";
import { saveAs } from "file-saver";
import XLSX from "xlsx-js-style";
import { formatDate, formatExpiryDate, intlLocale, parseExpiryDate } from "@/lib/helpers";
import { toJpeg } from "@/lib/images";
import { useFormDraft } from "@/hooks/use-form-draft";
import { useLocale, useTranslations } from "next-intl";
import { cn } from "@/lib/utils";
import { toast } from "@/hooks/use-toast";
import {
  Collapsible,
  CollapsibleTrigger,
  CollapsibleContent,
} from "@/components/ui/collapsible";
import { provinces } from "@/data/provinces";
import { motion } from "framer-motion";

const DRAFT_KEY = "hfyc:draft:vehicles";

const EMPTY_VEHICLE = {
  plateNumber: "",
  make: "",
  model: "",
  province: "",
  contractor: "",
  senewiyahNumber: "",
  wakalaNumber: "",
  softskinArmored: "",
  relatedPersons: [] as string[],
  subcontractor: "",
  associatedPetroChinaContractNumber: "",
  contractHoldingPetroChinaDepartment: "",
  eaLetterNumber: "",
  numberInEaList: "",
  securityClearanceExpiryDate: "",
  photo: null as unknown as File,
  senewiyah: null as unknown as File,
  wakala: undefined,
  armoredVehicleCertificate: undefined,
};

export default function VehiclesBadgeForm() {
  const locale = useLocale();
  const isRTL = locale === "ar";
  const formTranslations = useTranslations("vehiclesBadge.form");
  const formDescriptions = useTranslations("formDescriptions.vehicle");
  const companyDescriptions = useTranslations("formDescriptions.company");
  const commonTranslations = useTranslations("common");

  const [activeTab, setActiveTab] = useState("vehicle-0");
  const form = useForm<FormValues>({
    // Report problems as each field is left rather than saving them all up
    // for the moment the user hits submit.
    mode: "onTouched",
    resolver: zodResolver(formSchema),
    defaultValues: {
      vehicles: [EMPTY_VEHICLE],
    },
  });

  const { fields, append, remove } = useFieldArray({
    name: "vehicles",
    control: form.control,
  });

  // Drives the tab labels so they follow the plate numbers as they are typed.
  const watchedVehicles = useWatch({ control: form.control, name: "vehicles" });
  const { errors, isSubmitting } = form.formState;

  const { draft, save: saveDraft, clear: clearDraft, dismiss: dismissDraft } =
    useFormDraft<FormValues>(DRAFT_KEY);

  useEffect(() => {
    const subscription = form.watch((values) => saveDraft(values as FormValues));
    return () => subscription.unsubscribe();
  }, [form, saveDraft]);

  const restoreDraft = () => {
    if (!draft) return;
    form.reset(draft.values);
    dismissDraft();
    toast({
      title: commonTranslations("draftRestored"),
      description: commonTranslations("draftRestoredDescription"),
    });
  };

  const fileInputRef = useRef<HTMLInputElement>(null);

  const addVehicle = () => {
    // Every vehicle in a request shares the same contract details, so carry
    // them over instead of making the user retype them each time.
    const previous = form.getValues(`vehicles.${fields.length - 1}`);
    const shared = {
      contractor: previous?.contractor ?? "",
      subcontractor: previous?.subcontractor ?? "",
      associatedPetroChinaContractNumber: previous?.associatedPetroChinaContractNumber ?? "",
      contractHoldingPetroChinaDepartment: previous?.contractHoldingPetroChinaDepartment ?? "",
      eaLetterNumber: previous?.eaLetterNumber ?? "",
      securityClearanceExpiryDate: previous?.securityClearanceExpiryDate ?? "",
    };

    append({ ...EMPTY_VEHICLE, ...shared });
    setActiveTab(`vehicle-${fields.length}`);

    if (Object.values(shared).some(Boolean)) {
      toast({ title: commonTranslations("copiedFromPrevious") });
    }
  };

  const removeVehicle = (index: number) => {
    remove(index);
    if (fields.length > 1) {
      setActiveTab(`vehicle-${Math.max(0, index - 1)}`);
    }
  };

  // Validation failures are easy to miss when the offending field sits on a
  // tab that is not currently open, so jump to it and say so out loud.
  const onInvalid = (formErrors: FieldErrors<FormValues>) => {
    const vehicleErrors = (formErrors.vehicles ?? []) as unknown[];
    const firstInvalid = vehicleErrors.findIndex(Boolean);
    if (firstInvalid >= 0) setActiveTab(`vehicle-${firstInvalid}`);

    toast({
      title: commonTranslations("fixErrors"),
      description: commonTranslations("fixErrorsDescription"),
      variant: "destructive",
    });

    // Centre it so the floating navigation bar cannot cover it.
    window.setTimeout(() => {
      document
        .querySelector('[aria-invalid="true"]')
        ?.scrollIntoView({ behavior: "smooth", block: "center" });
    }, 50);
  };

  const onSubmit = async (data: FormValues) => {
    try {
      const zip = new JSZip();

      // Create folders
      const photosFolder = zip.folder("Photos");
      const senewiyahsFolder = zip.folder("Senewiyahs");
      const wakalasFolder = zip.folder("Wakalas");
      const armoredVehicleCertificatesFolder = zip.folder(
        "Armored Vehicle Certificates"
      );

      // Add files to ZIP if they exist. The badging system only reads JPEG, so
      // anything uploaded as PNG or GIF is re-encoded rather than just renamed.
      await Promise.all(
        data.vehicles.map(async (vehicle) => {
          const plateNumber = vehicle.plateNumber;
          const documentName = `${vehicle.make}+${vehicle.model}_${plateNumber}.jpg`;

          if (photosFolder && vehicle.photo) {
            photosFolder.file(`${plateNumber}.jpg`, await toJpeg(vehicle.photo));
          }
          if (senewiyahsFolder && vehicle.senewiyah) {
            senewiyahsFolder.file(documentName, await toJpeg(vehicle.senewiyah));
          }
          if (wakalasFolder && vehicle.wakala) {
            wakalasFolder.file(documentName, await toJpeg(vehicle.wakala));
          }
          if (armoredVehicleCertificatesFolder && vehicle.armoredVehicleCertificate) {
            armoredVehicleCertificatesFolder.file(
              documentName,
              await toJpeg(vehicle.armoredVehicleCertificate)
            );
          }
        })
      );

      // Prepare Excel data
      const excelData = data.vehicles.map((vehicle) => {
        const plateNumber = vehicle.plateNumber;

        return {
          ID: plateNumber,
          "First Name": vehicle.make,
          "Last Name": vehicle.model,
          Department: `HALFAYA/Contractor/${vehicle.contractor}`,
          "Start Time of Effective Period": formatDate(new Date()),
          "End Time of Effective Period": formatExpiryDate(vehicle.securityClearanceExpiryDate),
          "Enrollment Date": formatDate(new Date()),
          Type: "Basic Person",
          "Is Vehicle": "Yes",
          Province: vehicle.province,
          "Company Name": vehicle.contractor,
          "Subcontractor Name": vehicle.subcontractor,
          "Related Persons": Array.isArray(vehicle.relatedPersons)
            ? vehicle.relatedPersons.join(",")
            : vehicle.relatedPersons,
          "ID Document Number": vehicle.senewiyahNumber,
          "Associated PCH Contract Number":
            vehicle.associatedPetroChinaContractNumber,
          "Contract Holding PCH Department":
            vehicle.contractHoldingPetroChinaDepartment,
          Comments: "",
          "EA Letter Number": vehicle.eaLetterNumber,
          "Number in EA List": vehicle.numberInEaList,
          "Wakala Number": vehicle.wakalaNumber,
          ArmoredSoftskin: vehicle.softskinArmored,
        };
      });

      const headerText = [
        ["Rule"],
        ["At least one of family name and given name is required."],
        [
          "Once configured, the ID cannot be edited. Confirm the ID rule before setting an ID.",
        ],
        [
          "Do NOT change the layout and column title in this template file. The importing may fail if changed.",
        ],
        [
          "You can add persons to an existing departments. The department names should be separated by/. For example, import persons to Department A in All Departments. Format: All Departments/Department A.",
        ],
        [
          "Start Time of Effective Period is used for Access Control Module and Time & Attendance Module. Format: yyyy/mm/dd hh:mm:ss.",
        ],
        [
          "End Time of Effective Period is used for Access Control Module and Time & Attendance Module. Format: yyyy/mm/dd hh:mm:ss.",
        ],
        [
          "The platform does not support adding or editing basic information (including ID, first name, last name, phone number, and remarks) about domain persons and domain group persons and the information about domain persons linked to person information.",
        ],
        [
          "It supports editing the persons' additional information in a batch, the fields of which are already created in the system. Please enter the additional information according to the type. For single selection type, select one from the drop-down list.",
        ],
      ];

      const headers = [
        "ID",
        "First Name",
        "Last Name",
        "Department",
        "Start Time of Effective Period",
        "End Time of Effective Period",
        "Enrollment Date",
        "Type",
        "Is Vehicle",
        "Province",
        "Company Name",
        "Subcontractor Name",
        "Related Persons",
        "ID Document Number",
        "Associated PCH Contract Number",
        "Contract Holding PCH Department",
        "Comments",
        "EA Letter Number",
        "Number in EA List",
      ];

      const combinedData = [
        ...headerText,
        headers,
        ...excelData.map((obj) => Object.values(obj).slice(0, -2)),
      ];

      const worksheet = XLSX.utils.aoa_to_sheet(combinedData);

      // Calculate column widths based on headers and add a little extra width
      const colWidths = headers.map((header) => ({ wch: header.length + 10 }));

      // Set column widths
      worksheet["!cols"] = colWidths;

      const workbook = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(workbook, worksheet, "Register");
      const excelBuffer = XLSX.write(workbook, {
        bookType: "xlsx",
        type: "array",
      });

      // Add Excel file to ZIP
      zip.file(
        `${excelData[0]["Company Name"]} - ${excelData.length} vehicles request.xlsx`,
        excelBuffer
      );

      // Generate ZIP file and trigger download
      const zipBlob = await zip.generateAsync({ type: "blob" });
      saveAs(
        zipBlob,
        `${excelData[0]["Company Name"]} - ${excelData.length} vehicles request.zip`
      );

      clearDraft();

      toast({
        title: formTranslations("createZIPSuccess"),
        description: formTranslations("createZIPSuccessDescription"),
      });

      const notificationMessage = `New vehicle request submitted by ${data.vehicles[0].contractor} for ${data.vehicles.length} vehicle(s).`;
      await fetch("/api/log", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          requestType: "Vehicle Badge",
          message: notificationMessage,
        }),
      });
    } catch (error) {
      console.error("Error generating ZIP:", error);
      toast({
        title: formTranslations("createZIPFailed"),
        description: formTranslations("createZIPFailedDescription"),
        variant: "destructive",
      });
    }
  };

  const handleImportClick = () => {
    fileInputRef.current?.click();
  };

  const handleFileUpload = async (
    event: React.ChangeEvent<HTMLInputElement>
  ) => {
    const file = event.target.files?.[0];
    if (!file) return;

    if (file.name.endsWith(".zip")) {
      try {
        const zip = new JSZip();
        const contents = await zip.loadAsync(file);

        // Find the Excel file
        const excelFile = Object.values(contents.files).find((f) =>
          f.name.endsWith("request.xlsx")
        );
        if (!excelFile) {
          toast({
            title: "Error",
            description: "No Excel file found in the ZIP",
            variant: "destructive",
          });
          return;
        }

        // Read Excel data
        const excelData = await excelFile.async("arraybuffer");
        const workbook = XLSX.read(excelData, { type: "array" });
        const firstSheetName = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[firstSheetName];
        const jsonData = XLSX.utils.sheet_to_json(worksheet, { header: 1 });

        // Skip header rows
        const dataRows = jsonData.slice(10);

        // Map Excel data to form fields and process images
        const vehicles = await Promise.all(dataRows.map(async (row: any) => {
            const plateNumber = row[0];
            const make = row[1];
            const model = row[2];

            // Use exact paths like in personal form
            const photoFile = contents.files[`Photos/${plateNumber}.jpg`];
            const senewiyahFile = contents.files[`Senewiyahs/${make}+${model}_${plateNumber}.jpg`];
            const wakalaFile = contents.files[`Wakalas/${make}+${model}_${plateNumber}.jpg`];
            const armoredVehicleCertificateFile = contents.files[`Armored Vehicle Certificates/${make}+${model}_${plateNumber}.jpg`];

            return {
              plateNumber: plateNumber,
              make: make,
              model: model,
              contractor: row[10],
              province: row[9],
              senewiyahNumber: row[13],
              relatedPersons: row[12] ? row[12].split(",") : [],
              subcontractor: row[11],
              associatedPetroChinaContractNumber: row[14],
              contractHoldingPetroChinaDepartment: row[15],
              eaLetterNumber: row[17],
              numberInEaList: row[18],
              securityClearanceExpiryDate: parseExpiryDate(row[5]),
              // Armored/Softskin and the Wakala number are not part of the
              // access control template, so they cannot be restored from it.
              softskinArmored: "",
              wakalaNumber: "",
              photo: photoFile
                ? new File([await photoFile.async("blob")], photoFile.name, {
                    type: "image/jpeg",
                  })
                : undefined,
              senewiyah: senewiyahFile
                ? new File(
                    [await senewiyahFile.async("blob")],
                    senewiyahFile.name,
                    { type: "image/jpeg" }
                  )
                : undefined,
              wakala: wakalaFile
                ? new File([await wakalaFile.async("blob")], wakalaFile.name, {
                    type: "image/jpeg",
                  })
                : undefined,
              armoredVehicleCertificate: armoredVehicleCertificateFile
                ? new File(
                    [await armoredVehicleCertificateFile.async("blob")],
                    armoredVehicleCertificateFile.name,
                    { type: "image/jpeg" }
                  )
                : undefined,
            };
          })
        );

        // Filter out null values and update form
        const validVehicles = vehicles.filter(
          (v): v is NonNullable<typeof v> => v !== null
        );

        if (validVehicles.length === 0) {
          toast({
            title: formTranslations("error"),
            description: formTranslations("noValidDataFound"),
            variant: "destructive",
          });
          return;
        }

        form.reset({ vehicles: validVehicles.map(vehicle => ({
          ...vehicle,
          photo: vehicle.photo || undefined,
          senewiyah: vehicle.senewiyah || undefined,
          wakala: vehicle.wakala || undefined,
          armoredVehicleCertificate: vehicle.armoredVehicleCertificate || undefined
        })) });

        toast({
          title: formTranslations("importSuccess"),
          description: formTranslations("dataImportedSuccessfully"),
        });
      } catch (error) {
        console.error("Error processing ZIP file:", error);
        toast({
          title: formTranslations("error"),
          description: formTranslations("failedToProcessZipFile"),
          variant: "destructive",
        });
      }
    } else {
      toast({
        title: formTranslations("error"),
        description: formTranslations("pleaseUploadZipFile"),
        variant: "destructive",
      });
    }

    // Clear the input
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{
        type: "spring",
        stiffness: 100,
        damping: 15,
        duration: 0.4,
        mass: 1,
      }}
    >
      {draft && (
        <div className="mb-4 rounded-xl border border-amber-200 bg-amber-50 p-4 flex flex-col sm:flex-row sm:items-center gap-3">
          <RotateCcw className="h-5 w-5 text-amber-600 shrink-0" />
          <div className="flex-1">
            <p className="text-sm font-medium text-amber-900">
              {commonTranslations("draftFound", {
                when: new Date(draft.savedAt).toLocaleString(intlLocale(locale)),
              })}
            </p>
            <p className="text-xs text-amber-700 mt-0.5">
              {commonTranslations("draftPhotosNotIncluded")}
            </p>
          </div>
          <div className="flex gap-2 shrink-0">
            <Button type="button" size="sm" variant="outline" onClick={restoreDraft}>
              {commonTranslations("draftRestore")}
            </Button>
            <Button type="button" size="sm" variant="ghost" onClick={clearDraft}>
              {commonTranslations("draftDiscard")}
            </Button>
          </div>
        </div>
      )}

      <Card className="rounded-xl shadow-none border overflow-hidden">
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit, onInvalid)}>
            <Tabs
              value={activeTab}
              onValueChange={setActiveTab}
              className="w-full"
              dir={isRTL ? "rtl" : "ltr"}
            >
              <TabsList className="flex justify-start gap-x-2 rounded-none bg-green-50 items-center p-2 container overflow-x-scroll h-auto scroll-smooth scrollbar flex-row">
                {fields.map((field: any, index: any) => {
                  const plateNumber = watchedVehicles?.[index]?.plateNumber;
                  const hasError = Boolean(errors.vehicles?.[index]);

                  return (
                    <TabsTrigger
                      className={cn(
                        buttonVariants({ variant: "outline" }),
                        "rounded-xl bg-blue-50 gap-x-1.5",
                        hasError && "border-red-400 bg-red-50 text-red-600"
                      )}
                      key={field.id}
                      value={`vehicle-${index}`}
                    >
                      {hasError && <AlertCircle className="h-3.5 w-3.5 shrink-0" />}
                      {plateNumber || `${formTranslations("vehicle")} ${index + 1}`}
                    </TabsTrigger>
                  );
                })}
                <Button
                  type="button"
                  onClick={addVehicle}
                  variant="outline"
                  className="ml-2 rounded-xl"
                >
                  + {formTranslations("addVehicle")}
                </Button>
              </TabsList>
              {fields.map((field: any, index: any) => (
                <TabsContent
                  key={field.id}
                  value={`vehicle-${index}`}
                  className="mt-0 rounded-xl"
                >
                  <CardHeader className="">
                    <div className="flex justify-between items-center">
                      <CardTitle>
                        {formTranslations("vehicle")} {index + 1}{" "}
                        {formTranslations("details")}
                      </CardTitle>
                      {fields.length > 1 && (
                        <Button
                          type="button"
                          variant="outline"
                          className="rounded-xl"
                          size="icon"
                          onClick={() => removeVehicle(index)}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      )}
                    </div>
                    <CardDescription>
                      {formTranslations("allFieldsShouldBeFilledInEnglish")}
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-4">
                      <div className="grid grid-cols-1 gap-4">
                        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
                          <FormField
                            control={form.control}
                            name={`vehicles.${index}.plateNumber`}
                            render={({ field }: { field: any }) => (
                              <FormItem>
                                <FormLabel>
                                  {formTranslations("plateNumber")}
                                </FormLabel>
                                <FormControl>
                                  <Input
                                    {...field}
                                    onKeyDown={(e) => {
                                      if (e.key === " ") {
                                        e.preventDefault();
                                      }
                                    }}
                                  />
                                </FormControl>
                                <FormDescription>
                                  {formDescriptions("enterPlateNumber")}
                                </FormDescription>
                                <FormMessage />
                              </FormItem>
                            )}
                          />
                          <FormField
                            control={form.control}
                            name={`vehicles.${index}.make`}
                            render={({ field }: { field: any }) => (
                              <FormItem>
                                <FormLabel>
                                  {formTranslations("make")}
                                </FormLabel>
                                <FormControl>
                                  <Input {...field} />
                                </FormControl>
                                <FormDescription>
                                  {formDescriptions("enterMake")}
                                </FormDescription>
                                <FormMessage />
                              </FormItem>
                            )}
                          />
                          <FormField
                            control={form.control}
                            name={`vehicles.${index}.model`}
                            render={({ field }: { field: any }) => (
                              <FormItem>
                                <FormLabel>
                                  {formTranslations("model")}
                                </FormLabel>
                                <FormControl>
                                  <Input {...field} />
                                </FormControl>
                                <FormDescription>
                                  {formDescriptions("enterModel")}
                                </FormDescription>
                                <FormMessage />
                              </FormItem>
                            )}
                          />
                        </div>
                        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
                          <FormField
                            control={form.control}
                            name={`vehicles.${index}.contractor`}
                            render={({ field }: { field: any }) => (
                              <FormItem>
                                <FormLabel>
                                  {formTranslations("contractor")}
                                </FormLabel>
                                <FormControl>
                                  <Input {...field} />
                                </FormControl>
                                <FormDescription>
                                  {formDescriptions("enterContractor")}
                                </FormDescription>
                                <FormMessage />
                              </FormItem>
                            )}
                          />
                          <FormField
                            control={form.control}
                            name={`vehicles.${index}.province`}
                            render={({ field }: { field: any }) => (
                              <FormItem>
                                <FormLabel>
                                  {formTranslations("province")}
                                </FormLabel>
                                <Select
                                  dir={isRTL ? "rtl" : "ltr"}
                                  onValueChange={field.onChange}
                                  defaultValue={field.value}
                                >
                                  <FormControl>
                                    <SelectTrigger>
                                      <SelectValue
                                        placeholder={formTranslations(
                                          "selectProvince"
                                        )}
                                      />
                                    </SelectTrigger>
                                  </FormControl>
                                  <SelectContent>
                                    {provinces.map((province) => (
                                      <SelectItem
                                        key={province.id}
                                        value={province.name}
                                      >
                                        {locale === "ar"
                                          ? province.name_ar
                                          : locale === "cn"
                                          ? province.name_cn
                                          : province.name}
                                      </SelectItem>
                                    ))}
                                  </SelectContent>
                                </Select>
                                <FormDescription>
                                  {formDescriptions("selectProvince")}
                                </FormDescription>
                                <FormMessage />
                              </FormItem>
                            )}
                          />
                          <FormField
                            control={form.control}
                            name={`vehicles.${index}.senewiyahNumber`}
                            render={({ field }: { field: any }) => (
                              <FormItem>
                                <FormLabel>
                                  {formTranslations("senewiyahNumber")}
                                </FormLabel>
                                <FormControl>
                                  <Input {...field} />
                                </FormControl>
                                <FormDescription>
                                  {formDescriptions("enterSenewiyahNumber")}
                                </FormDescription>
                                <FormMessage />
                              </FormItem>
                            )}
                          />
                        </div>
                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                          <FormField
                            control={form.control}
                            name={`vehicles.${index}.wakalaNumber`}
                            render={({ field }: { field: any }) => (
                              <FormItem>
                                <FormLabel>
                                  {formTranslations("wakalaNumber")}
                                </FormLabel>
                                <FormControl>
                                  <Input {...field} />
                                </FormControl>
                                <FormDescription>
                                  {formDescriptions("enterWakalaNumber")}
                                </FormDescription>
                                <FormMessage />
                              </FormItem>
                            )}
                          />

                          <FormField
                            control={form.control}
                            name={`vehicles.${index}.softskinArmored`}
                            render={({ field }: { field: any }) => (
                              <FormItem>
                                <FormLabel>
                                  {formTranslations("softskinArmored")}
                                </FormLabel>
                                <FormControl>
                                  <Select
                                    onValueChange={field.onChange}
                                    defaultValue={"Softskin"}
                                  >
                                    <SelectTrigger>
                                      <SelectValue placeholder="Select Softskin/Armored" />
                                    </SelectTrigger>
                                    <SelectContent>
                                      <SelectItem value="Softskin">
                                        Softskin
                                      </SelectItem>
                                      <SelectItem value="Armored">
                                        Armored
                                      </SelectItem>
                                    </SelectContent>
                                  </Select>
                                </FormControl>
                                <FormDescription>
                                  {formDescriptions("enterSoftskinArmored")}
                                </FormDescription>
                                <FormMessage />
                              </FormItem>
                            )}
                          />

                          <FormField
                            control={form.control}
                            name={`vehicles.${index}.subcontractor`}
                            render={({ field }: { field: any }) => (
                              <FormItem>
                                <FormLabel>
                                  {formTranslations("subcontractor")}
                                </FormLabel>
                                <FormControl>
                                  <Input {...field} />
                                </FormControl>
                                <FormDescription>
                                  {formDescriptions("enterSubcontractor")}
                                </FormDescription>
                                <FormMessage />
                              </FormItem>
                            )}
                          />
                        </div>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                          <FormField
                            control={form.control}
                            name={`vehicles.${index}.associatedPetroChinaContractNumber`}
                            render={({ field }: { field: any }) => (
                              <FormItem>
                                <FormLabel>
                                  {formTranslations(
                                    "associatedPetroChinaContractNumber"
                                  )}
                                </FormLabel>
                                <FormControl>
                                  <Input {...field} />
                                </FormControl>
                                <FormDescription>
                                  {formDescriptions(
                                    "enterAssociatedPetroChinaContractNumber"
                                  )}
                                </FormDescription>
                                <FormMessage />
                              </FormItem>
                            )}
                          />
                          <FormField
                            control={form.control}
                            name={`vehicles.${index}.contractHoldingPetroChinaDepartment`}
                            render={({ field }: { field: any }) => (
                              <FormItem>
                                <FormLabel>
                                  {formTranslations(
                                    "contractHoldingPetroChinaDepartment"
                                  )}
                                </FormLabel>
                                <FormControl>
                                  <Input {...field} />
                                </FormControl>
                                <FormDescription>
                                  {formDescriptions(
                                    "enterContractHoldingPetroChinaDepartment"
                                  )}
                                </FormDescription>
                                <FormMessage />
                              </FormItem>
                            )}
                          />
                        </div>
                        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
                          <FormField
                            control={form.control}
                            name={`vehicles.${index}.eaLetterNumber`}
                            render={({ field }: { field: any }) => (
                              <FormItem>
                                <FormLabel>
                                  {formTranslations("eaLetterNumber")}
                                </FormLabel>
                                <FormControl>
                                  <Input {...field} />
                                </FormControl>
                                <FormDescription>
                                  {formDescriptions("enterEaLetterNumber")}
                                </FormDescription>
                                <FormMessage />
                              </FormItem>
                            )}
                          />
                          <FormField
                            control={form.control}
                            name={`vehicles.${index}.numberInEaList`}
                            render={({ field }: { field: any }) => (
                              <FormItem>
                                <FormLabel>
                                  {formTranslations("numberInEaList")}
                                </FormLabel>
                                <FormControl>
                                  <Input {...field} />
                                </FormControl>
                                <FormDescription>
                                  {formDescriptions("enterNumberInEaList")}
                                </FormDescription>
                                <FormMessage />
                              </FormItem>
                            )}
                          />
                          <FormField
                            control={form.control}
                            name={`vehicles.${index}.securityClearanceExpiryDate`}
                            render={({ field }: { field: any }) => (
                              <FormItem>
                                <FormLabel>
                                  {formTranslations("securityClearanceExpiryDate")}
                                </FormLabel>
                                <FormControl>
                                  <Input type="date" dir="ltr" {...field} value={field.value ?? ""} />
                                </FormControl>
                                <FormDescription>
                                  {formDescriptions("enterSecurityClearanceExpiryDate")}
                                  {formatExpiryDate(field.value) && (
                                    <span className="block mt-1 font-medium text-gray-700" dir="ltr">
                                      {commonTranslations("willBeWrittenAs")}: {formatExpiryDate(field.value)}
                                    </span>
                                  )}
                                </FormDescription>
                                <FormMessage />
                              </FormItem>
                            )}
                          />
                        </div>

                        <FormField
                          control={form.control}
                          name={`vehicles.${index}.relatedPersons`}
                          render={({ field }: { field: any }) => (
                            <FormItem>
                              <FormLabel className="flex items-center gap-2">
                                {formTranslations("relatedPersons")}
                                <span className="text-sm text-muted-foreground">
                                  ({field.value?.length || 0}/20)
                                </span>
                              </FormLabel>
                              <div className="space-y-3">
                                <div className="flex flex-wrap gap-2 p-4 border-2 border-dashed rounded-lg min-h-[80px] bg-gray-50/50 transition-all hover:border-gray-400">
                                  {field.value && field.value.length > 0 ? (
                                    field.value.map(
                                      (person: string, personIndex: number) => (
                                        <div
                                          key={personIndex}
                                          className="group flex items-center gap-2 bg-white border px-3 py-2 rounded-lg shadow-sm hover:shadow-md hover:border-blue-200 transition-all duration-200"
                                        >
                                          <span className="text-sm font-medium text-gray-700">
                                            {person}
                                          </span>
                                          <button
                                            type="button"
                                            onClick={() => {
                                              const newValue = [...field.value];
                                              newValue.splice(personIndex, 1);
                                              field.onChange(newValue);
                                              toast({
                                                title: "Removed",
                                                description: `Removed ${person} successfully`,
                                                variant: "default",
                                              });
                                            }}
                                            className="text-gray-400 opacity-0 group-hover:opacity-100 hover:text-red-500 transition-all duration-200"
                                          >
                                            <X className="h-4 w-4" />
                                          </button>
                                        </div>
                                      )
                                    )
                                  ) : (
                                    <div className="w-full h-full flex items-center justify-center text-gray-400 text-sm">
                                      {formTranslations("noHFYCNumberAddedYet")}
                                    </div>
                                  )}
                                </div>

                                <div className="relative">
                                  <Input
                                    placeholder={formTranslations(
                                      "enterHFYCNumber"
                                    )}
                                    className="pr-32 py-6 shadow-sm focus:ring-2 focus:ring-blue-200 transition-all"
                                    maxLength={8}
                                    onKeyDown={(e) => {
                                      if (e.key === "Enter") {
                                        e.preventDefault();
                                        const input = e.currentTarget;
                                        const value = input.value
                                          .trim()
                                          .toUpperCase();

                                        if (!value) return;

                                        const isValidFormat =
                                          /^HFYC\d{4}$/.test(value);
                                        const isDuplicate =
                                          field.value?.includes(value);
                                        const isAtLimit =
                                          field.value?.length >= 20;

                                        if (!isValidFormat) {
                                          toast({
                                            title: "⚠️ Invalid Format",
                                            description:
                                              "Please use format HFYC0001",
                                            variant: "destructive",
                                          });
                                          input.classList.add("border-red-500");
                                          setTimeout(
                                            () =>
                                              input.classList.remove(
                                                "border-red-500"
                                              ),
                                            2000
                                          );
                                          return;
                                        }

                                        if (isDuplicate) {
                                          toast({
                                            title: "⚠️ Already Added",
                                            description:
                                              "This HFYC number is already in the list",
                                            variant: "destructive",
                                          });
                                          return;
                                        }

                                        if (isAtLimit) {
                                          toast({
                                            title: "⚠️ Limit Reached",
                                            description:
                                              "Maximum 20 HFYC numbers allowed",
                                            variant: "destructive",
                                          });
                                          return;
                                        }

                                        const newValue = [
                                          ...(field.value || []),
                                          value,
                                        ];
                                        field.onChange(newValue);
                                        input.value = "";

                                        toast({
                                          title: "✅ Added Successfully",
                                          description: `${value} has been added to the list`,
                                          variant: "default",
                                        });
                                      }
                                    }}
                                  />
                                  <div className="absolute right-3 top-1/2 -translate-y-1/2 flex items-center gap-2 text-sm text-gray-400">
                                    <span className="px-2 py-1 rounded-md bg-gray-100">
                                      Enter ↵
                                    </span>
                                  </div>
                                </div>
                              </div>
                              <FormDescription className="mt-2 flex items-center gap-2">
                                <span className="text-blue-500">ℹ️</span>
                                {formDescriptions("enterRelatedPersons")}
                              </FormDescription>
                              <FormMessage />
                            </FormItem>
                          )}
                        />

                        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4">
                          <FormField
                            control={form.control}
                            name={`vehicles.${index}.photo`}
                            render={({ field }: { field: any }) => (
                              <FormItem>
                                <FormLabel>
                                  {formTranslations("photo")}
                                </FormLabel>
                                <FormControl>
                                  <CustomFileUpload
                                    initialFile={field.value}
                                    onChange={(file: any) =>
                                      form.setValue(
                                        `vehicles.${index}.photo`,
                                        file
                                      )
                                    }
                                    label={formTranslations("uploadPhoto")}
                                  />
                                </FormControl>
                                <FormDescription>
                                  {formDescriptions("uploadVehiclePhoto")}
                                </FormDescription>
                                <FormMessage />
                              </FormItem>
                            )}
                          />

                          <FormField
                            control={form.control}
                            name={`vehicles.${index}.senewiyah`}
                            render={({ field }: { field: any }) => (
                              <FormItem>
                                <FormLabel>
                                  {formTranslations("senewiyah")}
                                </FormLabel>
                                <FormControl>
                                  <CustomFileUpload
                                    initialFile={field.value}
                                    onChange={(file: any) => {
                                      form.setValue(
                                        `vehicles.${index}.senewiyah`,
                                        file || undefined
                                      );
                                    }}
                                    label={formTranslations("uploadSenewiyah")}
                                  />
                                </FormControl>
                                <FormDescription>
                                  {formDescriptions("uploadSenewiyah")}
                                </FormDescription>
                                <FormMessage />
                              </FormItem>
                            )}
                          />
                          <FormField
                            control={form.control}
                            name={`vehicles.${index}.wakala`}
                            render={({ field }: { field: any }) => (
                              <FormItem>
                                <FormLabel>
                                  {formTranslations("wakala")}
                                </FormLabel>
                                <FormControl>
                                  <CustomFileUpload
                                    initialFile={field.value}
                                    onChange={(file: any) => {
                                      form.setValue(
                                        `vehicles.${index}.wakala`,
                                        file || undefined
                                      );
                                    }}
                                    label={formTranslations("uploadWakala")}
                                  />
                                </FormControl>
                                <FormDescription>
                                  {formDescriptions("uploadWakala")}
                                </FormDescription>
                                <FormMessage />
                              </FormItem>
                            )}
                          />
                          <FormField
                            control={form.control}
                            name={`vehicles.${index}.armoredVehicleCertificate`}
                            render={({ field }: { field: any }) => (
                              <FormItem>
                                <FormLabel>
                                  {formTranslations(
                                    "armoredVehicleCertificate"
                                  )}
                                </FormLabel>
                                <FormControl>
                                  <CustomFileUpload
                                    initialFile={field.value}
                                    onChange={(file: any) =>
                                      form.setValue(
                                        `vehicles.${index}.armoredVehicleCertificate`,
                                        file || undefined
                                      )
                                    }
                                    label={formTranslations(
                                      "uploadArmoredVehicleCertificate"
                                    )}
                                  />
                                </FormControl>
                                <FormDescription>
                                  {formDescriptions(
                                    "uploadArmoredVehicleCertificate"
                                  )}
                                </FormDescription>
                                <FormMessage />
                              </FormItem>
                            )}
                          />
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </TabsContent>
              ))}
            </Tabs>
            <CardFooter className="py-4 border-t flex justify-between">
              <Button className="w-full sm:w-auto" type="submit" disabled={isSubmitting}>
                {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                {isSubmitting
                  ? commonTranslations("generating")
                  : formTranslations("generateZIP")}
              </Button>
            </CardFooter>
          </form>
        </Form>
      </Card>

      <Collapsible className="mt-4 ">
        <CollapsibleTrigger asChild>
          <div className="w-full p-4 flex items-center justify-between cursor-pointer border border-dashed border-gray-300 rounded-xl hover:bg-gray-50 transition-colors duration-200">
            <p className="text-sm text-gray-600">
              {formTranslations("importZIPDescription")}
            </p>
            <Button
              variant="outline"
              size="sm"
              className="group flex items-center justify-center gap-1"
            >
              <Upload className="mr-2 h-4 w-4 group-hover:scale-110 transition-transform duration-200" />
              {formTranslations("importZIP")}
            </Button>
          </div>
        </CollapsibleTrigger>
        <CollapsibleContent className="">
          <div className="space-y-4 bg-blue-50 p-4 rounded-xl border my-4">
            <div
              className="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center cursor-pointer hover:border-blue-500"
              onDragOver={(e) => e.preventDefault()}
              onDrop={(e) => {
                e.preventDefault();
                const files = e.dataTransfer.files;
                if (files.length) {
                  handleFileUpload(
                    e as unknown as React.ChangeEvent<HTMLInputElement>
                  );
                }
              }}
              onClick={handleImportClick}
            >
              <input
                type="file"
                ref={fileInputRef}
                onChange={handleFileUpload}
                style={{ display: "none" }}
                accept=".zip"
              />
              <FileArchive className="mx-auto h-8 w-8 text-gray-400" />
              <p className="mt-2 text-sm text-gray-600">
                {formTranslations("dragDropZipFile")}
              </p>
              <p className="mt-1 text-xs text-gray-500">
                {formTranslations("supportedFormatsZip")}
              </p>
            </div>
          </div>
        </CollapsibleContent>
      </Collapsible>
    </motion.div>
  );
}
