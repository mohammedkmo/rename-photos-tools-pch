"use client";

import { useEffect, useMemo, useRef } from "react";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm, useFieldArray, useWatch, Controller, type FieldErrors } from "react-hook-form";
import JSZip from "jszip";
import { saveAs } from "file-saver";
import XLSX from "xlsx-js-style";
import { Loader2, Plus, RotateCcw, X } from "lucide-react";
import { useLocale, useTranslations } from "next-intl";

import { FormValues, VehicleValues, formSchema } from "@/schema/vehicle";
import { provinces } from "@/data/provinces";
import { formatDate, formatExpiryDate, intlLocale } from "@/lib/helpers";
import { toJpeg } from "@/lib/images";
import { useFormDraft } from "@/hooks/use-form-draft";
import { toast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";
import DocumentCell from "@/components/grid/DocumentCell";

const DRAFT_KEY = "hfyc:draft:vehicles";

const EMPTY_VEHICLE: VehicleValues = {
  plateNumber: "",
  province: "",
  make: "",
  model: "",
  softskinArmored: "Softskin",
  senewiyahNumber: "",
  wakalaNumber: "",
  subcontractor: "",
  relatedPersons: "",
  eaLetterNumber: "",
  numberInEaList: "",
  securityClearanceExpiryDate: "",
  photo: null as unknown as File,
  senewiyah: null as unknown as File,
  wakala: undefined,
  armoredVehicleCertificate: undefined,
};

// Percentages so the sheet fills the screen. They must total 100.
const COLUMN_WIDTHS = [
  "3%",
  "6.5%", "6.5%", "6.5%", "6.5%", "6.5%",
  "7.5%", "6.5%",
  "7%",
  "8%",
  "5.5%", "5.5%", "7%",
  "4.375%", "4.375%", "4.375%", "4.375%",
];

const REQUIRED_TEXT_FIELDS = [
  "plateNumber", "province", "make", "model",
  "senewiyahNumber", "eaLetterNumber", "numberInEaList",
  "securityClearanceExpiryDate",
] as const;

const isRowComplete = (vehicle?: Partial<VehicleValues>) =>
  Boolean(
    vehicle &&
    REQUIRED_TEXT_FIELDS.every((key) => String(vehicle[key] ?? "").trim()) &&
    vehicle.photo &&
    vehicle.senewiyah
  );

// "HFYC1234 ,HFYC5678," -> "HFYC1234,HFYC5678"
const normaliseDrivers = (value?: string) =>
  (value ?? "")
    .split(",")
    .map((entry) => entry.trim())
    .filter(Boolean)
    .join(",");

export default function VehiclesBadgeForm() {
  const locale = useLocale();
  const formTranslations = useTranslations("vehiclesBadge.form");
  const gridTranslations = useTranslations("grid");
  const commonTranslations = useTranslations("common");

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema(formTranslations)),
    mode: "onTouched",
    defaultValues: {
      contractor: "",
      associatedPetroChinaContractNumber: "",
      contractHoldingPetroChinaDepartment: "",
      vehicles: [EMPTY_VEHICLE],
    },
  });

  const { fields, append, remove } = useFieldArray({ name: "vehicles", control: form.control });
  const vehicles = useWatch({ control: form.control, name: "vehicles" });
  const { errors, isSubmitting } = form.formState;
  const gridRef = useRef<HTMLDivElement>(null);

  const { draft, save: saveDraft, clear: clearDraft, dismiss: dismissDraft } =
    useFormDraft<FormValues>(DRAFT_KEY);

  useEffect(() => {
    const subscription = form.watch((values) => saveDraft(values as FormValues));
    return () => subscription.unsubscribe();
  }, [form, saveDraft]);

  const counts = useMemo(() => {
    const rows = (vehicles ?? []) as Partial<VehicleValues>[];
    return {
      total: rows.length,
      photos: rows.filter((row) => row?.photo).length,
      attention: rows.filter((row) => !isRowComplete(row)).length,
    };
  }, [vehicles]);

  const addVehicle = () => {
    append({ ...EMPTY_VEHICLE });
    window.setTimeout(() => {
      gridRef.current?.scrollTo({ top: gridRef.current.scrollHeight, behavior: "smooth" });
    }, 0);
  };

  const restoreDraft = () => {
    if (!draft) return;
    form.reset(draft.values);
    dismissDraft();
    toast({
      title: commonTranslations("draftRestored"),
      description: commonTranslations("draftRestoredDescription"),
    });
  };

  const onInvalid = (_formErrors: FieldErrors<FormValues>) => {
    toast({
      title: commonTranslations("fixErrors"),
      description: gridTranslations("fixErrorsInGrid"),
      variant: "destructive",
    });
    window.setTimeout(() => {
      document
        .querySelector('[data-invalid="true"]')
        ?.scrollIntoView({ behavior: "smooth", block: "center", inline: "center" });
    }, 50);
  };

  const onSubmit = async (data: FormValues) => {
    try {
      const zip = new JSZip();

      const photosFolder = zip.folder("Photos");
      const senewiyahsFolder = zip.folder("Senewiyahs");
      const wakalasFolder = zip.folder("Wakalas");
      const armoredVehicleCertificatesFolder = zip.folder("Armored Vehicle Certificates");

      // The badging system only reads JPEG, so anything uploaded as PNG or GIF
      // is re-encoded rather than just renamed.
      await Promise.all(
        data.vehicles.map(async (vehicle) => {
          const documentName = `${vehicle.make}+${vehicle.model}_${vehicle.plateNumber}.jpg`;

          if (vehicle.photo) {
            photosFolder!.file(`${vehicle.plateNumber}.jpg`, await toJpeg(vehicle.photo));
          }
          if (vehicle.senewiyah) {
            senewiyahsFolder!.file(documentName, await toJpeg(vehicle.senewiyah));
          }
          if (vehicle.wakala) {
            wakalasFolder!.file(documentName, await toJpeg(vehicle.wakala));
          }
          if (vehicle.armoredVehicleCertificate) {
            armoredVehicleCertificatesFolder!.file(
              documentName,
              await toJpeg(vehicle.armoredVehicleCertificate)
            );
          }
        })
      );

      const excelData = data.vehicles.map((vehicle) => ({
        ID: vehicle.plateNumber,
        "First Name": vehicle.make,
        "Last Name": vehicle.model,
        Department: `HALFAYA/Contractor/${data.contractor}`,
        "Start Time of Effective Period": formatDate(new Date()),
        "End Time of Effective Period": formatExpiryDate(vehicle.securityClearanceExpiryDate),
        "Enrollment Date": formatDate(new Date()),
        Type: "Basic Person",
        "Is Vehicle": "Yes",
        Province: vehicle.province,
        "Company Name": data.contractor,
        "Subcontractor Name": vehicle.subcontractor,
        "Related Persons": normaliseDrivers(vehicle.relatedPersons),
        "ID Document Number": vehicle.senewiyahNumber,
        "Associated PCH Contract Number": data.associatedPetroChinaContractNumber,
        "Contract Holding PCH Department": data.contractHoldingPetroChinaDepartment,
        Comments: "",
        "EA Letter Number": vehicle.eaLetterNumber,
        "Number in EA List": vehicle.numberInEaList,
      }));

      const headerText = [
        ["Rule"],
        ["At least one of family name and given name is required."],
        ["Once configured, the ID cannot be edited. Confirm the ID rule before setting an ID."],
        ["Do NOT change the layout and column title in this template file. The importing may fail if changed."],
        ["You can add persons to an existing departments. The department names should be separated by/. For example, import persons to Department A in All Departments. Format: All Departments/Department A."],
        ["Start Time of Effective Period is used for Access Control Module and Time & Attendance Module. Format: yyyy/mm/dd hh:mm:ss."],
        ["End Time of Effective Period is used for Access Control Module and Time & Attendance Module. Format: yyyy/mm/dd hh:mm:ss."],
        ["The platform does not support adding or editing basic information (including ID, first name, last name, phone number, and remarks) about domain persons and domain group persons and the information about domain persons linked to person information."],
        ["It supports editing the persons' additional information in a batch, the fields of which are already created in the system. Please enter the additional information according to the type. For single selection type, select one from the drop-down list."],
      ];

      const headers = [
        "ID", "First Name", "Last Name", "Department",
        "Start Time of Effective Period", "End Time of Effective Period",
        "Enrollment Date", "Type", "Is Vehicle", "Province", "Company Name",
        "Subcontractor Name", "Related Persons", "ID Document Number",
        "Associated PCH Contract Number", "Contract Holding PCH Department",
        "Comments", "EA Letter Number", "Number in EA List",
      ];

      const combinedData = [...headerText, headers, ...excelData.map(Object.values)];
      const worksheet = XLSX.utils.aoa_to_sheet(combinedData);
      worksheet["!cols"] = headers.map((header) => ({ wch: header.length + 10 }));

      const workbook = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(workbook, worksheet, "Register");
      const excelBuffer = XLSX.write(workbook, { bookType: "xlsx", type: "array" });

      zip.file(`${data.contractor} - ${excelData.length} vehicles request.xlsx`, excelBuffer);

      const zipBlob = await zip.generateAsync({ type: "blob" });
      saveAs(zipBlob, `${data.contractor} - ${excelData.length} vehicles request.zip`);

      clearDraft();

      toast({
        title: formTranslations("createZIPSuccess"),
        description: formTranslations("createZIPSuccessDescription"),
      });

      await fetch("/api/log", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          requestType: "Vehicle Badge",
          message: `New vehicle request submitted by ${data.contractor} for ${data.vehicles.length} vehicle(s).`,
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

  // ── cell helpers ────────────────────────────────────────────────────────
  const cellClass = (invalid?: boolean) =>
    cn(
      "w-full h-full px-3 bg-transparent text-[13.5px] text-pch-ink outline-none",
      "focus:bg-pch-accentSoft focus:ring-2 focus:ring-inset focus:ring-pch-accent",
      invalid && "bg-pch-stopBg text-pch-stopInk font-medium"
    );

  const TextCell = ({
    index, name, mono, placeholder,
  }: { index: number; name: keyof VehicleValues; mono?: boolean; placeholder?: string }) => {
    const invalid = Boolean((errors.vehicles?.[index] as any)?.[name]);
    const message = (errors.vehicles?.[index] as any)?.[name]?.message as string | undefined;
    return (
      <td
        className="p-0 border-b border-e border-pch-line h-11"
        data-invalid={invalid || undefined}
        title={message}
      >
        <input
          {...form.register(`vehicles.${index}.${name}` as const)}
          placeholder={placeholder}
          className={cn(cellClass(invalid), mono && "font-mono text-[12.5px] tabular-nums")}
        />
      </td>
    );
  };

  const DocCell = ({
    index, name, label, required,
  }: { index: number; name: "photo" | "senewiyah" | "wakala" | "armoredVehicleCertificate"; label: string; required?: boolean }) => {
    const invalid = Boolean((errors.vehicles?.[index] as any)?.[name]);
    return (
      <td className="p-0 border-b border-e border-pch-line h-11" data-invalid={invalid || undefined}>
        <Controller
          control={form.control}
          name={`vehicles.${index}.${name}` as const}
          render={({ field }) => (
            <DocumentCell
              value={field.value as File | undefined}
              onChange={(file) => field.onChange(file ?? undefined)}
              label={label}
              required={required}
              invalid={invalid}
            />
          )}
        />
      </td>
    );
  };

  const headerCell = (label: string, required?: boolean) => (
    <th
      title={label}
      className="h-9 px-3 text-start text-[12px] font-semibold text-pch-ink2 bg-pch-surface border-b border-pch-line2 border-e border-e-pch-line sticky top-[30px] z-10 whitespace-nowrap overflow-hidden text-ellipsis"
    >
      {label}
      {required && <span className="text-pch-stopInk ms-0.5 font-normal">*</span>}
    </th>
  );

  const groupCell = (label: string, span: number, accent?: boolean) => (
    <th
      colSpan={span}
      className={cn(
        "h-[30px] px-3 text-start text-[10.5px] font-semibold uppercase tracking-[0.08em] bg-pch-subtle border-b border-pch-line sticky top-0 z-10",
        accent ? "text-pch-accentInk" : "text-pch-ink3"
      )}
    >
      {label}
    </th>
  );

  const requestField = (
    name: "contractor" | "associatedPetroChinaContractNumber" | "contractHoldingPetroChinaDepartment",
    label: string,
    width: string,
    mono?: boolean
  ) => {
    const invalid = Boolean(errors[name]);
    return (
      <div className="flex flex-col gap-1.5">
        <label className="text-[11px] font-semibold uppercase tracking-[0.04em] text-pch-ink3">
          {label}
        </label>
        <input
          {...form.register(name)}
          data-invalid={invalid || undefined}
          className={cn(
            "h-10 rounded-md border px-3 text-[14px] font-medium text-pch-ink bg-pch-surface shadow-sm",
            "focus:outline-none focus:border-pch-accent focus:ring-[3px] focus:ring-pch-accent/20",
            mono && "font-mono text-[13px] tabular-nums",
            width,
            invalid ? "border-pch-stopEdge" : "border-pch-line2"
          )}
        />
        {invalid && (
          <span className="text-[11.5px] text-pch-stopInk">{errors[name]?.message as string}</span>
        )}
      </div>
    );
  };

  return (
    <form
      onSubmit={form.handleSubmit(onSubmit, onInvalid)}
      className="flex-1 min-h-0 flex flex-col"
    >
      {draft && (
        <div className="flex-none flex flex-col sm:flex-row sm:items-center gap-3 px-5 py-3 bg-pch-warnBg/60 border-b border-pch-line">
          <RotateCcw className="h-5 w-5 text-pch-warnInk shrink-0" />
          <div className="flex-1">
            <p className="text-[13px] font-medium text-pch-warnInk">
              {commonTranslations("draftFound", {
                when: new Date(draft.savedAt).toLocaleString(intlLocale(locale)),
              })}
            </p>
            <p className="text-[11.5px] text-pch-warnInk/80">
              {commonTranslations("draftPhotosNotIncluded")}
            </p>
          </div>
          <div className="flex gap-2 shrink-0">
            <button type="button" onClick={restoreDraft}
              className="h-8 px-3 rounded-md border border-pch-line2 bg-pch-surface text-[12.5px] font-medium hover:border-pch-ink3">
              {commonTranslations("draftRestore")}
            </button>
            <button type="button" onClick={clearDraft}
              className="h-8 px-3 rounded-md text-[12.5px] font-medium text-pch-ink2 hover:bg-pch-surface">
              {commonTranslations("draftDiscard")}
            </button>
          </div>
        </div>
      )}

      <div className="flex-none flex flex-wrap items-end gap-6 px-5 py-4 bg-pch-surface border-b border-pch-line">
        {requestField("contractor", formTranslations("contractor"), "min-w-[300px]")}
        {requestField("associatedPetroChinaContractNumber", formTranslations("associatedPetroChinaContractNumber"), "min-w-[190px]", true)}
        {requestField("contractHoldingPetroChinaDepartment", formTranslations("contractHoldingPetroChinaDepartment"), "min-w-[190px]")}

        <div className="ms-auto flex gap-7 pb-1">
          {[
            { value: counts.total, label: gridTranslations("vehicle") },
            { value: counts.photos, label: gridTranslations("photos") },
            { value: counts.attention, label: gridTranslations("needAttention"), warn: true },
          ].map((stat) => (
            <div key={stat.label} className="flex flex-col gap-0.5">
              <b className={cn(
                "text-[21px] font-semibold tabular-nums tracking-tight",
                stat.warn && stat.value > 0 && "text-pch-warnInk"
              )}>
                {stat.value}
              </b>
              <span className="text-[11px] font-semibold uppercase tracking-[0.04em] text-pch-ink3">
                {stat.label}
              </span>
            </div>
          ))}
        </div>
      </div>

      <div className="flex-none flex items-center gap-3 px-5 py-2.5 bg-pch-subtle border-b border-pch-line">
        <button
          type="button"
          onClick={addVehicle}
          className="inline-flex items-center gap-1.5 h-8 px-3 rounded-md border border-pch-line2 bg-pch-surface text-[13px] font-medium text-pch-ink2 shadow-sm hover:text-pch-ink hover:border-pch-ink3"
        >
          <Plus className="h-3.5 w-3.5" />
          {formTranslations("addVehicle")}
        </button>
        <span className="ms-auto text-[12.5px] text-pch-ink3 hidden md:inline">
          {gridTranslations("driversHint")}
        </span>
      </div>

      <div ref={gridRef} className="flex-1 min-h-0 overflow-auto bg-pch-surface">
        <table className="table-fixed w-full min-w-[1320px] border-separate border-spacing-0">
          <colgroup>
            {COLUMN_WIDTHS.map((width, index) => <col key={index} style={{ width }} />)}
          </colgroup>
          <thead>
            <tr>
              <th className="h-[30px] bg-pch-subtle border-b border-e border-pch-line sticky top-0 z-10" />
              {groupCell(gridTranslations("vehicle"), 5)}
              {groupCell(gridTranslations("registration"), 2)}
              {groupCell(gridTranslations("contract"), 1)}
              {groupCell(gridTranslations("drivers"), 1)}
              {groupCell(gridTranslations("clearance"), 3)}
              {groupCell(gridTranslations("documents"), 4, true)}
            </tr>
            <tr>
              <th className="h-9 bg-pch-surface border-b border-pch-line2 border-e border-e-pch-line sticky top-[30px] z-10" />
              {headerCell(gridTranslations("colPlate"), true)}
              {headerCell(gridTranslations("colProvince"), true)}
              {headerCell(gridTranslations("colMake"), true)}
              {headerCell(gridTranslations("colModel"), true)}
              {headerCell(gridTranslations("colArmored"))}
              {headerCell(gridTranslations("colSenewiyah"), true)}
              {headerCell(gridTranslations("colWakala"))}
              {headerCell(gridTranslations("colSubcontractor"))}
              {headerCell(gridTranslations("colDrivers"))}
              {headerCell(gridTranslations("colEaLetter"), true)}
              {headerCell(gridTranslations("colEaList"), true)}
              {headerCell(gridTranslations("colExpires"), true)}
              {headerCell(gridTranslations("colVehiclePhoto"), true)}
              {headerCell(gridTranslations("colSenewiyahDoc"), true)}
              {headerCell(gridTranslations("colWakalaDoc"))}
              {headerCell(gridTranslations("colArmoredDoc"))}
            </tr>
          </thead>

          <tbody>
            {fields.map((field, index) => {
              const row = vehicles?.[index] as Partial<VehicleValues> | undefined;
              const rowInvalid = Boolean(errors.vehicles?.[index]);
              const complete = isRowComplete(row);

              return (
                <tr key={field.id} className="group/row hover:bg-pch-ground">
                  <td className="relative p-0 border-b border-e border-pch-line text-center align-middle">
                    <span
                      aria-hidden="true"
                      className={cn(
                        "absolute inset-y-0 start-0 w-[3px]",
                        rowInvalid ? "bg-pch-stopEdge" : complete ? "bg-transparent" : "bg-pch-warnEdge"
                      )}
                    />
                    <span className={cn(
                      "font-mono text-[11.5px] tabular-nums group-hover/row:hidden",
                      rowInvalid ? "text-pch-stopInk font-semibold" : "text-pch-ink3"
                    )}>
                      {index + 1}
                    </span>
                    {fields.length > 1 && (
                      <button
                        type="button"
                        onClick={() => remove(index)}
                        title={gridTranslations("removeRow")}
                        className="hidden group-hover/row:inline-flex h-5 w-5 items-center justify-center rounded text-pch-ink3 hover:text-pch-stopInk hover:bg-pch-stopBg"
                      >
                        <X className="h-3.5 w-3.5" />
                      </button>
                    )}
                  </td>

                  <TextCell index={index} name="plateNumber" mono />

                  <td
                    className="p-0 border-b border-e border-pch-line h-11"
                    data-invalid={Boolean(errors.vehicles?.[index]?.province) || undefined}
                  >
                    <select
                      {...form.register(`vehicles.${index}.province` as const)}
                      className={cn(cellClass(Boolean(errors.vehicles?.[index]?.province)), "appearance-none cursor-pointer")}
                    >
                      <option value="" />
                      {provinces.map((province) => (
                        <option key={province.id} value={province.name}>
                          {locale === "ar"
                            ? province.name_ar
                            : locale === "cn"
                              ? province.name_cn
                              : province.name}
                        </option>
                      ))}
                    </select>
                  </td>

                  <TextCell index={index} name="make" />
                  <TextCell index={index} name="model" />

                  <td className="p-0 border-b border-e border-pch-line h-11">
                    <select
                      {...form.register(`vehicles.${index}.softskinArmored` as const)}
                      className={cn(cellClass(false), "appearance-none cursor-pointer")}
                    >
                      <option value="Softskin">Softskin</option>
                      <option value="Armored">Armored</option>
                    </select>
                  </td>

                  <TextCell index={index} name="senewiyahNumber" mono />
                  <TextCell index={index} name="wakalaNumber" mono />
                  <TextCell index={index} name="subcontractor" />
                  <TextCell index={index} name="relatedPersons" mono placeholder="HFYC1234, HFYC5678" />
                  <TextCell index={index} name="eaLetterNumber" mono />
                  <TextCell index={index} name="numberInEaList" mono />

                  <td
                    className="p-0 border-b border-e border-pch-line h-11"
                    data-invalid={Boolean(errors.vehicles?.[index]?.securityClearanceExpiryDate) || undefined}
                    title={formatExpiryDate(row?.securityClearanceExpiryDate ?? "") || undefined}
                  >
                    <input
                      type="date"
                      dir="ltr"
                      {...form.register(`vehicles.${index}.securityClearanceExpiryDate` as const)}
                      className={cn(
                        cellClass(Boolean(errors.vehicles?.[index]?.securityClearanceExpiryDate)),
                        "font-mono text-[12.5px] tabular-nums"
                      )}
                    />
                  </td>

                  <DocCell index={index} name="photo" label={gridTranslations("colVehiclePhoto")} required />
                  <DocCell index={index} name="senewiyah" label={gridTranslations("colSenewiyahDoc")} required />
                  <DocCell index={index} name="wakala" label={gridTranslations("colWakalaDoc")} />
                  <DocCell index={index} name="armoredVehicleCertificate" label={gridTranslations("colArmoredDoc")} />
                </tr>
              );
            })}

            <tr onClick={addVehicle} className="cursor-pointer hover:bg-pch-accentSoft group/add">
              <td className="border-b border-e border-pch-line text-center h-10">
                <span className="font-mono text-[11.5px] text-pch-ink3 group-hover/add:text-pch-accentInk">+</span>
              </td>
              <td colSpan={16} className="border-b border-pch-line px-3 text-[13px] text-pch-ink3 group-hover/add:text-pch-accentInk">
                {formTranslations("addVehicle")}
              </td>
            </tr>
          </tbody>
        </table>
      </div>

      <div className="flex-none flex flex-wrap items-center gap-4 px-5 py-3.5 bg-pch-surface border-t border-pch-line2">
        <p className="text-[13.5px] text-pch-ink2">
          <b className="text-pch-ink font-semibold">
            {gridTranslations("vehicleCount", { count: counts.total })}
          </b>
          {" · "}
          {gridTranslations("photoCount", { count: counts.photos })}
          {counts.attention > 0 && (
            <>
              {" · "}
              <span className="text-pch-warnInk font-semibold">
                {gridTranslations("attentionCount", { count: counts.attention })}
              </span>
            </>
          )}
        </p>
        <button
          type="submit"
          disabled={isSubmitting}
          className="ms-auto inline-flex items-center gap-2 h-10 px-5 rounded-md bg-pch-accent text-white text-[14px] font-semibold shadow-md hover:brightness-110 disabled:opacity-45 disabled:cursor-not-allowed disabled:brightness-100"
        >
          {isSubmitting && <Loader2 className="h-4 w-4 animate-spin" />}
          {isSubmitting ? commonTranslations("generating") : formTranslations("generateZIP")}
        </button>
      </div>
    </form>
  );
}
