"use client";

import { useState, useRef, useEffect } from "react";
import { zodResolver } from "@hookform/resolvers/zod";
import { Button, buttonVariants } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
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
import { AlertCircle, FileArchive, Loader2, RotateCcw, Trash2, Upload } from "lucide-react";
import { FormValues, formSchema } from "@/schema/employee";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import { nationalities } from "@/data/nationalities";
import CustomFileUpload from "@/components/ui/customFileUpload";
import JSZip from "jszip";
import { saveAs } from "file-saver";
import XLSX from 'xlsx-js-style';
import { formatDate, formatExpiryDate, intlLocale, parseExpiryDate } from "@/lib/helpers";
import { toJpeg } from "@/lib/images";
import { useFormDraft } from "@/hooks/use-form-draft";
import { useLocale, useTranslations } from 'next-intl';
import { cn } from "@/lib/utils";
import { toast } from "@/hooks/use-toast";
import { Collapsible, CollapsibleTrigger, CollapsibleContent } from "@/components/ui/collapsible"
import { motion } from "framer-motion";

const DRAFT_KEY = "hfyc:draft:personal";

const EMPTY_EMPLOYEE = {
    id: "",
    firstName: "",
    lastName: "",
    contractor: "",
    position: "",
    idDocumentNumber: "",
    nationality: "",
    subcontractor: "",
    associatedPetroChinaContractNumber: "",
    contractHoldingPetroChinaDepartment: "",
    eaLetterNumber: "",
    numberInEaList: "",
    securityClearanceExpiryDate: "",
    photo: null as unknown as File,
    idDocument: null as unknown as File,
    drivingLicense: undefined,
    moiCard: undefined,
};

export default function PersonalBadgeForm() {
    const locale = useLocale();
    const isRTL = locale === 'ar';
    const formTranslations = useTranslations('personalBadge.form');
    const formDescriptions = useTranslations('formDescriptions.personal');
    const companyDescriptions = useTranslations('formDescriptions.company');
    const commonTranslations = useTranslations('common');

    const [activeTab, setActiveTab] = useState("employee-0");

    const form = useForm<FormValues>({
        resolver: zodResolver(formSchema(formTranslations)),
        // Report problems as each field is left rather than saving them all up
        // for the moment the user hits submit.
        mode: "onTouched",
        defaultValues: {
            employees: [EMPTY_EMPLOYEE],
        },
    });

    const { fields, append, remove } = useFieldArray({
        name: "employees",
        control: form.control,
    });

    // Drives the tab labels so they follow the names as they are typed.
    const watchedEmployees = useWatch({ control: form.control, name: "employees" });
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
            title: commonTranslations('draftRestored'),
            description: commonTranslations('draftRestoredDescription'),
        });
    };

    const fileInputRef = useRef<HTMLInputElement>(null);

    const addEmployee = () => {
        // Everyone in a request shares the same contract details, so carry them
        // over instead of making the user retype them for each employee.
        const previous = form.getValues(`employees.${fields.length - 1}`);
        const shared = {
            contractor: previous?.contractor ?? "",
            subcontractor: previous?.subcontractor ?? "",
            associatedPetroChinaContractNumber: previous?.associatedPetroChinaContractNumber ?? "",
            contractHoldingPetroChinaDepartment: previous?.contractHoldingPetroChinaDepartment ?? "",
            eaLetterNumber: previous?.eaLetterNumber ?? "",
            securityClearanceExpiryDate: previous?.securityClearanceExpiryDate ?? "",
        };

        append({ ...EMPTY_EMPLOYEE, ...shared });
        setActiveTab(`employee-${fields.length}`);

        if (Object.values(shared).some(Boolean)) {
            toast({ title: commonTranslations('copiedFromPrevious') });
        }
    };

    const removeEmployee = (index: number) => {
        remove(index);
        if (fields.length > 1) {
            setActiveTab(`employee-${Math.max(0, index - 1)}`);
        }
    };

    // Validation failures are easy to miss when the offending field sits on a
    // tab that is not currently open, so jump to it and say so out loud.
    const onInvalid = (formErrors: FieldErrors<FormValues>) => {
        const employeeErrors = (formErrors.employees ?? []) as unknown[];
        const firstInvalid = employeeErrors.findIndex(Boolean);
        if (firstInvalid >= 0) setActiveTab(`employee-${firstInvalid}`);

        toast({
            title: commonTranslations('fixErrors'),
            description: commonTranslations('fixErrorsDescription'),
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
        const idDocsFolder = zip.folder("ID Documents");
        const drivingLicensesFolder = zip.folder("Driving Licences");
        const moiCardsFolder = zip.folder("MOI Cards");

        // Add files to ZIP. The badging system only reads JPEG, so anything
        // uploaded as PNG or GIF is re-encoded rather than just renamed.
        await Promise.all(
            data.employees.map(async (employee) => {
                const badgeNumber = `HFYC${employee.id}`;
                const fileName = `${employee.firstName}+${employee.lastName}_${badgeNumber}.jpg`;

                photosFolder!.file(fileName, await toJpeg(employee.photo));
                idDocsFolder!.file(fileName, await toJpeg(employee.idDocument));
                if (employee.drivingLicense) {
                    drivingLicensesFolder!.file(fileName, await toJpeg(employee.drivingLicense));
                }
                if (employee.moiCard) {
                    moiCardsFolder!.file(fileName, await toJpeg(employee.moiCard));
                }
            })
        );

        // Prepare Excel data
        const excelData = data.employees.map((employee) => {
            const badgeNumber = `HFYC${employee.id}`;

            // Return employee data for Excel
            return {
                "ID": badgeNumber,
                "First Name": employee.firstName,
                "Last Name": employee.lastName,
                "Department": `HALFAYA/Contractor/${employee.contractor}`,
                "Start Time of Effective Period": formatDate(new Date()),
                "End Time of Effective Period": formatExpiryDate(employee.securityClearanceExpiryDate),
                "Enrollment Date": formatDate(new Date()),
                "Type": "Basic Person",
                "Company Name": employee.contractor,
                "Subcontractor Name": employee.subcontractor,
                "ID Document Number": employee.idDocumentNumber,
                "Nationality": employee.nationality,
                "Associated PCH Contract Number":
                    employee.associatedPetroChinaContractNumber,
                "Contract Holding PCH Department":
                    employee.contractHoldingPetroChinaDepartment,
                "Comments": "",
                "EA Letter Number": employee.eaLetterNumber,
                "Number in EA List": employee.numberInEaList,
                "Access Revoked": "NO",
                "Position-": employee.position,
                "Sponsor Badge": "NO",
            };
        });

        const headerText = [
            ["Rule"],
            ["At least one of family name and given name is required."],
            ["Once configured, the ID cannot be edited. Confirm the ID rule before setting an ID."],
            ["Do NOT change the layout and column title in this template file. The importing may fail if changed."],
            ["You can add persons to an existing departments. The department names should be separated by/. For example, import persons to Department A in All Departments. Format: All Departments/Department A."],
            ["Start Time of Effective Period is used for Access Control Module and Time & Attendance Module. Format: yyyy/mm/dd hh:mm:ss."],
            ["End Time of Effective Period is used for Access Control Module and Time & Attendance Module. Format: yyyy/mm/dd hh:mm:ss."],
            ["The platform does not support adding or editing basic information (including ID, first name, last name, phone number, and remarks) about domain persons and domain group persons and the information about domain persons linked to person information."],
            ["It supports editing the persons' additional information in a batch, the fields of which are already created in the system. Please enter the additional information according to the type. For single selection type, select one from the drop-down list."]
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
            "Company Name",
            "Subcontractor Name",
            "ID Document Number",
            "Nationality",
            "Associated PCH Contract Number",
            "Contract Holding PCH Department",
            "Comments",
            "EA Letter Number",
            "Number in EA List",
            "Access Revoked",
            "Position-",
            "Sponsor Badge",
        ];

        const combinedData = [...headerText, headers, ...excelData.map(Object.values)];

        const worksheet = XLSX.utils.aoa_to_sheet(combinedData);


        // Calculate column widths based on headers and add a little extra width
        const colWidths = headers.map(header => ({ wch: header.length + 10 }));

        // Set column widths
        worksheet['!cols'] = colWidths;


        const workbook = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(workbook, worksheet, "Register");
        const excelBuffer = XLSX.write(workbook, {
            bookType: "xlsx",
            type: "array",
        });

        // Add Excel file to ZIP
        zip.file(`${excelData[0]["Company Name"]} - ${excelData.length} employees request.xlsx`, excelBuffer);

        // Generate ZIP file and trigger download
        const zipBlob = await zip.generateAsync({ type: "blob" });
        saveAs(zipBlob, `${excelData[0]["Company Name"]} - ${excelData.length} employees request.zip`);

        clearDraft();

        toast({
            title: formTranslations('createZIPSuccess'),
            description: formTranslations('createZIPSuccessDescription')
        });

        const notificationMessage = `New request submitted by ${data.employees[0].contractor} for ${data.employees.length} employee(s).`;
        await fetch('/api/log', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ requestType: 'Personal Badge', message: notificationMessage }),
        });


       } catch (error) {
        toast({ 
            title: formTranslations('createZIPFailed'), 
            description: formTranslations('createZIPFailedDescription'), 
            variant: "destructive" 
        });
       }
    };

    const handleImportClick = () => {
        fileInputRef.current?.click();
    };

    const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
        const file = event.target.files?.[0];
        if (file && file.name.endsWith('.zip')) {
            try {
                const zip = new JSZip();
                const contents = await zip.loadAsync(file);

                // Find the Excel file
                const excelFile = Object.values(contents.files).find(f => f.name.endsWith('.xlsx'));
                if (!excelFile) {
                    toast({ title: "Error", description: "No Excel file found in the ZIP", variant: "destructive" });
                    return;
                }

                // Read Excel data
                const excelData = await excelFile.async('arraybuffer');
                const workbook = XLSX.read(excelData, { type: 'array' });
                const firstSheetName = workbook.SheetNames[0];
                const worksheet = workbook.Sheets[firstSheetName];
                const jsonData = XLSX.utils.sheet_to_json(worksheet, { header: 1 });

                // Skip header rows
                const dataRows = jsonData.slice(10);

                // Map Excel data to form fields and process images
                const employees = await Promise.all(dataRows.map(async (row: any, index: number) => {
                    const badgeNumber = row[0];
                    const photoFile = contents.files[`Photos/${row[1]}+${row[2]}_${badgeNumber}.jpg`];
                    const idDocFile = contents.files[`ID Documents/${row[1]}+${row[2]}_${badgeNumber}.jpg`];
                    const drivingLicenseFile = contents.files[`Driving Licences/${row[1]}+${row[2]}_${badgeNumber}.jpg`];
                    const moiCardFile = contents.files[`MOI Cards/${row[1]}+${row[2]}_${badgeNumber}.jpg`];

                    return {
                        id: badgeNumber?.replace('HFYC', ''),
                        firstName: row[1],
                        lastName: row[2],
                        contractor: row[8],
                        position: row[18],
                        idDocumentNumber: row[10],
                        nationality: row[11],
                        subcontractor: row[9],
                        associatedPetroChinaContractNumber: row[12],
                        contractHoldingPetroChinaDepartment: row[13],
                        eaLetterNumber: row[15],
                        numberInEaList: row[16],
                        securityClearanceExpiryDate: parseExpiryDate(row[5]),
                        photo: photoFile ? new File([await photoFile.async('blob')], photoFile.name, { type: 'image/jpeg' }) : null,
                        idDocument: idDocFile ? new File([await idDocFile.async('blob')], idDocFile.name, { type: 'image/jpeg' }) : null,
                        drivingLicense: drivingLicenseFile ? new File([await drivingLicenseFile.async('blob')], drivingLicenseFile.name, { type: 'image/jpeg' }) : undefined,
                        moiCard: moiCardFile ? new File([await moiCardFile.async('blob')], moiCardFile.name, { type: 'image/jpeg' }) : undefined,
                    };
                }));
                // Update form with imported data
                form.reset({
                    employees: employees.map(employee => ({
                        ...employee,
                        photo: employee.photo || undefined,
                        idDocument: employee.idDocument || undefined,
                        drivingLicense: employee.drivingLicense || undefined,
                        moiCard: employee.moiCard || undefined
                    }))
                });
                toast({ 
                    title: formTranslations('importSuccess'), 
                    description: formTranslations('dataImportedSuccessfully') 
                });
            } catch (error) {
                console.error("Error processing ZIP file:", error);
                toast({ 
                    title: formTranslations('error'), 
                    description: formTranslations('failedToProcessZipFile'), 
                    variant: "destructive" 
                });
            }
        } else {
            toast({ title: "Error", description: "Please upload a ZIP file", variant: "destructive" });
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
                            {commonTranslations('draftFound', {
                                when: new Date(draft.savedAt).toLocaleString(intlLocale(locale)),
                            })}
                        </p>
                        <p className="text-xs text-amber-700 mt-0.5">
                            {commonTranslations('draftPhotosNotIncluded')}
                        </p>
                    </div>
                    <div className="flex gap-2 shrink-0">
                        <Button type="button" size="sm" variant="outline" onClick={restoreDraft}>
                            {commonTranslations('draftRestore')}
                        </Button>
                        <Button type="button" size="sm" variant="ghost" onClick={clearDraft}>
                            {commonTranslations('draftDiscard')}
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
                            dir={isRTL ? 'rtl' : 'ltr'}
                        >
                            <TabsList className="flex rounded-none justify-start gap-x-2 bg-blue-50 items-center p-2 container overflow-x-scroll h-auto scroll-smooth scrollbar flex-row">
                                {fields.map((field: any, index: any) => {
                                    const employee = watchedEmployees?.[index];
                                    const name = [employee?.firstName, employee?.lastName]
                                        .filter(Boolean)
                                        .join(" ");
                                    const hasError = Boolean(errors.employees?.[index]);

                                    return (
                                        <TabsTrigger
                                            className={cn(
                                                buttonVariants({ variant: "outline" }),
                                                "rounded-xl bg-blue-50 gap-x-1.5",
                                                hasError && "border-red-400 bg-red-50 text-red-600"
                                            )}
                                            key={field.id}
                                            value={`employee-${index}`}
                                        >
                                            {hasError && <AlertCircle className="h-3.5 w-3.5 shrink-0" />}
                                            {name || `${formTranslations('employee')} ${index + 1}`}
                                        </TabsTrigger>
                                    );
                                })}
                                <Button
                                    type="button"
                                    onClick={addEmployee}
                                    variant="outline"
                                    className="ml-2 rounded-xl"
                                >
                                    + {formTranslations('addEmployee')}
                                </Button>
                            </TabsList>
                            {fields.map((field: any, index: any) => (
                                <TabsContent
                                    key={field.id}
                                    value={`employee-${index}`}
                                    className="mt-0 rounded-xl"
                                >
                                    <CardHeader className="">
                                        <div className="flex justify-between items-center">
                                            <CardTitle>{formTranslations('employee')} {index + 1} {formTranslations('details')}</CardTitle>
                                            {fields.length > 1 && (
                                                <Button
                                                    type="button"
                                                    variant="outline"
                                                    className="rounded-xl"
                                                    size="icon"
                                                    onClick={() => removeEmployee(index)}
                                                >
                                                    <Trash2 className="h-4 w-4" />
                                                </Button>
                                            )}
                                        </div>
                                        <CardDescription>
                                            {formTranslations('allFieldsShouldBeFilledInEnglish')}
                                        </CardDescription>
                                    </CardHeader>
                                    <CardContent>
                                        <div className="space-y-4">
                                            <div className="grid grid-cols-1 gap-4">
                                                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
                                                    <FormField
                                                        control={form.control}
                                                        name={`employees.${index}.id`}
                                                        render={({ field }: { field: any }) => (
                                                            <FormItem>
                                                                <FormLabel>{formTranslations('badgeNumber')}</FormLabel>
                                                                <div dir="ltr" className="flex" >
                                                                    <span className="inline-flex items-center px-3 text-sm text-gray-900 bg-gray-200 border border-gray-300 rounded-l-lg border-r-0">
                                                                        HFYC-
                                                                    </span>
                                                                    <FormControl>
                                                                        <Input
                                                                            className="rounded-l-none"
                                                                            maxLength={4}
                                                                            onInput={(e) => {
                                                                                const inputElement =
                                                                                    e.target as HTMLInputElement;
                                                                                inputElement.value =
                                                                                    inputElement.value.replace(
                                                                                        /[^0-9]/g,
                                                                                        ""
                                                                                    );
                                                                            }}
                                                                            {...field}
                                                                        />
                                                                    </FormControl>
                                                                </div>
                                                                <FormDescription>
                                                                    {formDescriptions('enterHFYCNumber')}
                                                                </FormDescription>
                                                                <FormMessage />
                                                            </FormItem>
                                                        )}
                                                    />
                                                    <FormField
                                                        control={form.control}
                                                        name={`employees.${index}.firstName`}
                                                        render={({ field }: { field: any }) => (
                                                            <FormItem>
                                                                <FormLabel>{formTranslations('firstName')}</FormLabel>
                                                                <FormControl>
                                                                    <Input {...field} />
                                                                </FormControl>
                                                                <FormDescription>
                                                                    {formDescriptions('enterFirstName')}
                                                                </FormDescription>
                                                                <FormMessage />
                                                            </FormItem>
                                                        )}
                                                    />
                                                    <FormField
                                                        control={form.control}
                                                        name={`employees.${index}.lastName`}
                                                        render={({ field }: { field: any }) => (
                                                            <FormItem>
                                                                <FormLabel>{formTranslations('lastName')}</FormLabel>
                                                                <FormControl>
                                                                    <Input {...field} />
                                                                </FormControl>
                                                                <FormDescription>
                                                                    {formDescriptions('enterLastName')}
                                                                </FormDescription>
                                                                <FormMessage />
                                                            </FormItem>
                                                        )}
                                                    />
                                                </div>
                                                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
                                                    <FormField
                                                        control={form.control}
                                                        name={`employees.${index}.contractor`}
                                                        render={({ field }: { field: any }) => (
                                                            <FormItem>
                                                                <FormLabel>{formTranslations('contractorName')}</FormLabel>
                                                                <FormControl>
                                                                    <Input {...field} />
                                                                </FormControl>
                                                                <FormDescription>
                                                                    {formDescriptions('enterCompanyName')}
                                                                </FormDescription>
                                                                <FormMessage />
                                                            </FormItem>
                                                        )}
                                                    />
                                                    <FormField
                                                        control={form.control}
                                                        name={`employees.${index}.position`}
                                                        render={({ field }: { field: any }) => (
                                                            <FormItem>
                                                                <FormLabel>{formTranslations('position')}</FormLabel>
                                                                <FormControl>
                                                                    <Input {...field} />
                                                                </FormControl>
                                                                <FormDescription>
                                                                    {formDescriptions('enterPosition')}
                                                                </FormDescription>
                                                                <FormMessage />
                                                            </FormItem>
                                                        )}
                                                    />
                                                    <FormField
                                                        control={form.control}
                                                        name={`employees.${index}.idDocumentNumber`}
                                                        render={({ field }: { field: any }) => (
                                                            <FormItem>
                                                                <FormLabel>{formTranslations('idDocumentNumber')}</FormLabel>
                                                                <FormControl>
                                                                    <Input {...field} />
                                                                </FormControl>
                                                                <FormDescription>
                                                                    {formDescriptions('enterIdDocumentNumber')}
                                                                </FormDescription>
                                                                <FormMessage />
                                                            </FormItem>
                                                        )}
                                                    />
                                                </div>
                                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                                    <FormField
                                                        control={form.control}
                                                        name={`employees.${index}.nationality`}
                                                        render={({ field }: { field: any }) => (
                                                            <FormItem>
                                                                <FormLabel>{formTranslations('nationality')}</FormLabel>
                                                                <Select
                                                                    dir={isRTL ? 'rtl' : 'ltr'}
                                                                    onValueChange={field.onChange}
                                                                    defaultValue={field.value}
                                                                >
                                                                    <FormControl>
                                                                        <SelectTrigger>
                                                                            <SelectValue placeholder={formTranslations('selectNationality')} />
                                                                        </SelectTrigger>
                                                                    </FormControl>
                                                                    <SelectContent>
                                                                        {nationalities.map((nationality) => (
                                                                            <SelectItem
                                                                                key={nationality.num_code}
                                                                                value={nationality.nationality}
                                                                            >
                                                                                {locale === 'ar' ? nationality.nationality_ar : locale === 'cn' ? nationality.nationality_cn : nationality.nationality}
                                                                            </SelectItem>
                                                                        ))}
                                                                    </SelectContent>
                                                                </Select>
                                                                <FormDescription>
                                                                    {formDescriptions('selectEmployeeNationality')}
                                                                </FormDescription>
                                                                <FormMessage />
                                                            </FormItem>
                                                        )}
                                                    />
                                                    <FormField
                                                        control={form.control}
                                                        name={`employees.${index}.subcontractor`}
                                                        render={({ field }: { field: any }) => (
                                                            <FormItem>
                                                                <FormLabel>
                                                                    {formTranslations('subcontractor')}
                                                                </FormLabel>
                                                                <FormControl>
                                                                    <Input {...field} />
                                                                </FormControl>
                                                                <FormDescription>
                                                                    {formDescriptions('enterSubcontractorName')}
                                                                </FormDescription>
                                                                <FormMessage />
                                                            </FormItem>
                                                        )}
                                                    />
                                                </div>
                                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                                    <FormField
                                                        control={form.control}
                                                        name={`employees.${index}.associatedPetroChinaContractNumber`}
                                                        render={({ field }: { field: any }) => (
                                                            <FormItem>
                                                                <FormLabel>
                                                                    {formTranslations('associatedPetroChinaContractNumber')}
                                                                </FormLabel>
                                                                <FormControl>
                                                                    <Input {...field} />
                                                                </FormControl>
                                                                <FormDescription>
                                                                    {formDescriptions('enterAssociatedPetroChinaContractNumber')}
                                                                </FormDescription>
                                                                <FormMessage />
                                                            </FormItem>
                                                        )}
                                                    />
                                                    <FormField
                                                        control={form.control}
                                                        name={`employees.${index}.contractHoldingPetroChinaDepartment`}
                                                        render={({ field }: { field: any }) => (
                                                            <FormItem>
                                                                <FormLabel>
                                                                    {formTranslations('contractHoldingPetroChinaDepartment')}
                                                                </FormLabel>
                                                                <FormControl>
                                                                    <Input {...field} />
                                                                </FormControl>
                                                                <FormDescription>
                                                                    {formDescriptions('enterContractHoldingPetroChinaDepartment')}
                                                                </FormDescription>
                                                                <FormMessage />
                                                            </FormItem>
                                                        )}
                                                    />
                                                </div>
                                                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
                                                    <FormField
                                                        control={form.control}
                                                        name={`employees.${index}.eaLetterNumber`}
                                                        render={({ field }: { field: any }) => (
                                                            <FormItem>
                                                                <FormLabel>{formTranslations('eaLetterNumber')}</FormLabel>
                                                                <FormControl>
                                                                    <Input type="number" {...field} />
                                                                </FormControl>
                                                                <FormDescription>
                                                                    {formDescriptions('enterEaLetterNumber')}
                                                                </FormDescription>
                                                                <FormMessage />
                                                            </FormItem>
                                                        )}
                                                    />
                                                    <FormField
                                                        control={form.control}
                                                        name={`employees.${index}.numberInEaList`}
                                                        render={({ field }: { field: any }) => (
                                                            <FormItem>
                                                                <FormLabel>{formTranslations('numberInEaList')}</FormLabel>
                                                                <FormControl>
                                                                    <Input type="number" {...field} />
                                                                </FormControl>
                                                                <FormDescription>
                                                                    {formDescriptions('enterNumberInEaList')}
                                                                </FormDescription>
                                                                <FormMessage />
                                                            </FormItem>
                                                        )}
                                                    />
                                                    <FormField
                                                        control={form.control}
                                                        name={`employees.${index}.securityClearanceExpiryDate`}
                                                        render={({ field }: { field: any }) => (
                                                            <FormItem>
                                                                <FormLabel>{formTranslations('securityClearanceExpiryDate')}</FormLabel>
                                                                <FormControl>
                                                                    <Input type="date" dir="ltr" {...field} value={field.value ?? ""} />
                                                                </FormControl>
                                                                <FormDescription>
                                                                    {formDescriptions('enterSecurityClearanceExpiryDate')}
                                                                    {formatExpiryDate(field.value) && (
                                                                        <span className="block mt-1 font-medium text-gray-700" dir="ltr">
                                                                            {commonTranslations('willBeWrittenAs')}: {formatExpiryDate(field.value)}
                                                                        </span>
                                                                    )}
                                                                </FormDescription>
                                                                <FormMessage />
                                                            </FormItem>
                                                        )}
                                                    />
                                                </div>
                                                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4">
                                                    <FormField
                                                        control={form.control}
                                                        name={`employees.${index}.photo`}
                                                        render={({ field }: { field: any }) => (
                                                            <FormItem>
                                                                <FormLabel>{formTranslations('photo')}</FormLabel>
                                                                <FormControl>
                                                                    <CustomFileUpload
                                                                        initialFile={field.value}
                                                                        onChange={(file: any) =>
                                                                            form.setValue(
                                                                                `employees.${index}.photo`,
                                                                                file
                                                                            )
                                                                        }
                                                                        label={formTranslations('uploadPhoto')}
                                                                    />
                                                                </FormControl>
                                                                <FormDescription>
                                                                    {formDescriptions('uploadEmployeePhoto')}
                                                                </FormDescription>
                                                                <FormMessage />
                                                            </FormItem>
                                                        )}
                                                    />
                                                    <FormField
                                                        control={form.control}
                                                        name={`employees.${index}.idDocument`}
                                                        render={({ field }: { field: any }) => (
                                                            <FormItem>
                                                                <FormLabel>{formTranslations('idDocument')}</FormLabel>
                                                                <FormControl>
                                                                    <CustomFileUpload
                                                                        initialFile={field.value}
                                                                        onChange={(file: any) =>
                                                                            form.setValue(
                                                                                `employees.${index}.idDocument`,
                                                                                file
                                                                            )
                                                                        }
                                                                        label={formTranslations('uploadIdDocument')}
                                                                    />
                                                                </FormControl>
                                                                <FormDescription>
                                                                    {formDescriptions('uploadEmployeeIdDocument')}
                                                                </FormDescription>
                                                                <FormMessage />
                                                            </FormItem>
                                                        )}
                                                    />
                                                    <FormField
                                                        control={form.control}
                                                        name={`employees.${index}.drivingLicense`}
                                                        render={({ field }: { field: any }) => (
                                                            <FormItem>
                                                                <FormLabel>
                                                                    {formTranslations('drivingLicense')}
                                                                </FormLabel>
                                                                <FormControl>
                                                                    <CustomFileUpload
                                                                        initialFile={field.value}
                                                                        onChange={(file: any) => {
                                                                            form.setValue(
                                                                                `employees.${index}.drivingLicense`,
                                                                                file || undefined
                                                                            );
                                                                        }}
                                                                        label={formTranslations('uploadDrivingLicense')}
                                                                    />
                                                                </FormControl>
                                                                <FormDescription>
                                                                    {formDescriptions('uploadEmployeeDrivingLicense')}
                                                                </FormDescription>
                                                                <FormMessage />
                                                            </FormItem>
                                                        )}
                                                    />
                                                    <FormField
                                                        control={form.control}
                                                        name={`employees.${index}.moiCard`}
                                                        render={({ field }: { field: any }) => (
                                                            <FormItem>
                                                                <FormLabel>
                                                                    {formTranslations('moiCard')}
                                                                </FormLabel>
                                                                <FormControl>
                                                                    <CustomFileUpload
                                                                        initialFile={field.value}
                                                                        onChange={(file: any) => {
                                                                            form.setValue(
                                                                                `employees.${index}.moiCard`,
                                                                                file || undefined
                                                                            );
                                                                        }}
                                                                        label={formTranslations('uploadMoiCard')}
                                                                    />
                                                                </FormControl>
                                                                <FormDescription>
                                                                    {formDescriptions('uploadEmployeeMoiCard')}
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
                                    ? commonTranslations('generating')
                                    : formTranslations('generateZIP')}
                            </Button>
                        </CardFooter>
                    </form>
                </Form>
            </Card>

            <Collapsible className="mt-4 ">
                <CollapsibleTrigger asChild>
                    <div className="w-full p-4 flex items-center justify-between cursor-pointer border border-dashed border-gray-300 rounded-xl hover:bg-gray-50 transition-colors duration-200">
                        <p className="text-sm text-gray-600">{formTranslations('importZIPDescription')}</p>
                        <Button variant="outline" size="sm" className="group flex items-center justify-center gap-1">
                            <Upload className="mr-2 h-4 w-4 group-hover:scale-110 transition-transform duration-200" />
                            {formTranslations('importZIP')}
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
                                    handleFileUpload(e as unknown as React.ChangeEvent<HTMLInputElement>);
                                }
                            }}
                            onClick={handleImportClick}
                        >
                            <input
                                type="file"
                                ref={fileInputRef}
                                onChange={handleFileUpload}
                                style={{ display: 'none' }}
                                accept=".zip"
                            />
                            <FileArchive className="mx-auto h-8 w-8 text-gray-400" />
                            <p className="mt-2 text-sm text-gray-600">{formTranslations('dragDropZipFile')}</p>
                            <p className="mt-1 text-xs text-gray-500">{formTranslations('supportedFormatsZip')}</p>
                        </div>
                    </div>
                </CollapsibleContent>
            </Collapsible>
        </motion.div>
    )
}