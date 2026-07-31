"use client";

import { useEffect, useMemo, useRef } from "react";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm, useFieldArray, useWatch, Controller, type FieldErrors } from "react-hook-form";
import JSZip from "jszip";
import { saveAs } from "file-saver";
import XLSX from "xlsx-js-style";
import { Building2, FileText, Plus, X } from "lucide-react";
import { useLocale, useTranslations } from "next-intl";

import { FormValues, VehicleValues, formSchema } from "@/schema/vehicle";
import { provinces } from "@/data/provinces";
import { excelDate, excelExpiryDate, formatExpiryDate } from "@/lib/helpers";
import { applyDateFormat } from "@/lib/excel";
import { toJpeg } from "@/lib/images";
import { useDocument } from "@/hooks/use-document";
import { toast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";
import { TextCell, SelectCell, DateCell, DocumentTd, CustomCell } from "@/components/grid/cells";
import DriverBadgesCell from "@/components/grid/DriverBadgesCell";
import SheetContextMenu from "@/components/grid/SheetContextMenu";
import RequestHeader from "@/components/grid/RequestHeader";
import InstructionsPopover from "@/components/grid/InstructionsPopover";
import HeaderPortal, { HEADER_ACTION_SLOT, HEADER_DOC_SLOT } from "@/components/layout/HeaderPortal";
import SheetFooter from "@/components/grid/SheetFooter";
import GenerateZipButton from "@/components/grid/GenerateZipButton";
import { useSheet } from "@/hooks/use-sheet";
import { useCollaborativeForm } from "@/hooks/use-collaborative-form";
import CollaborationControls from "@/components/collaboration/CollaborationControls";
import type { SharedRow } from "@/lib/collaboration/types";

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

// Column order for the selection layer. `null` marks a column the clipboard
// cannot fill, because its value is a file rather than text.
const COLUMN_KEYS: (keyof VehicleValues | null)[] = [
  "plateNumber", "province", "make", "model", "softskinArmored",
  "senewiyahNumber", "wakalaNumber", "subcontractor", "relatedPersons",
  "eaLetterNumber", "numberInEaList", "securityClearanceExpiryDate",
  null, null, null, null,
];

const REQUIRED_TEXT_FIELDS = [
  "plateNumber", "province", "make", "model",
  "senewiyahNumber", "eaLetterNumber", "numberInEaList",
  "securityClearanceExpiryDate",
] as const;

const VEHICLE_TEXT_FIELDS = [
  "plateNumber", "province", "make", "model", "softskinArmored",
  "senewiyahNumber", "wakalaNumber", "subcontractor", "relatedPersons",
  "eaLetterNumber", "numberInEaList", "securityClearanceExpiryDate",
];

const VEHICLE_MEDIA_FIELDS: Record<string, keyof SharedRow> = {
  photo: "mediaPhoto",
  senewiyah: "mediaSenewiyah",
  wakala: "mediaWakala",
  armoredVehicleCertificate: "mediaArmoredVehicleCertificate",
};

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

export default function VehiclesBadgeForm({ documentId }: { documentId?: string }) {
  const locale = useLocale();
  const formTranslations = useTranslations("vehiclesBadge.form");
  const gridTranslations = useTranslations("grid");
  const pageTranslations = useTranslations("vehiclesBadge");
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

  const { fields, append, insert, remove, replace } = useFieldArray({ name: "vehicles", control: form.control });
  const vehicles = useWatch({ control: form.control, name: "vehicles" });
  const shared = useWatch({
    control: form.control,
    name: ["contractor", "associatedPetroChinaContractNumber", "contractHoldingPetroChinaDepartment"],
  });
  const { errors, isSubmitting } = form.formState;
  const gridRef = useRef<HTMLDivElement>(null);
  const collaborative = useCollaborativeForm({
    form,
    arrayName: "vehicles",
    emptyRow: EMPTY_VEHICLE,
    textFields: VEHICLE_TEXT_FIELDS,
    mediaFields: VEHICLE_MEDIA_FIELDS,
    replaceRows: replace,
  });

  const sheet = useSheet({
    rowCount: fields.length,
    columnKeys: COLUMN_KEYS as (string | null)[],
    readCell: (row, col) => String(form.getValues(`vehicles.${row}.${COLUMN_KEYS[col]}` as any) ?? ""),
    writeCell: (row, col, value) =>
      form.setValue(`vehicles.${row}.${COLUMN_KEYS[col]}` as any, value, {
        shouldDirty: true,
        shouldValidate: true,
      }),
    ensureRows: (count) => {
      if (collaborative.ensureRows(count)) return;
      const missing = count - form.getValues("vehicles").length;
      if (missing > 0) append(Array.from({ length: missing }, () => ({ ...EMPTY_VEHICLE })));
    },
    insertRow: (at) => {
      if (!collaborative.addRow(at)) insert(at, { ...EMPTY_VEHICLE });
    },
    deleteRow: (at) => {
      if (!collaborative.removeRow(at)) remove(at);
    },
    onSelectionChange: collaborative.setSelection,
  });

  const doc = useDocument<FormValues>({
    id: documentId ?? null,
    kind: "vehicles",
    form,
    arrayName: "vehicles",
    enabled: !collaborative.collaboration,
  });

  const counts = useMemo(() => {
    const rows = (vehicles ?? []) as Partial<VehicleValues>[];
    return {
      total: rows.length,
      photos: rows.filter((row, index) =>
        collaborative.collaboration
          ? collaborative.mediaStatus(index, "photo")
          : row?.photo
      ).length,
      attention: rows.filter((row, index) => {
        const textReady = REQUIRED_TEXT_FIELDS.every((key) =>
          String(row?.[key] ?? "").trim()
        );
        const mediaReady = collaborative.collaboration
          ? collaborative.mediaStatus(index, "photo") &&
            collaborative.mediaStatus(index, "senewiyah")
          : Boolean(row?.photo && row?.senewiyah);
        return !(textReady && mediaReady);
      }).length,
    };
  }, [collaborative, vehicles]);

  const addVehicle = () => {
    if (!collaborative.addRow()) append({ ...EMPTY_VEHICLE });
    window.setTimeout(() => {
      gridRef.current?.scrollTo({ top: gridRef.current.scrollHeight, behavior: "smooth" });
    }, 0);
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
    if (collaborative.collaboration && !collaborative.collaboration.isOwner) return;
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
        "Start Time of Effective Period": excelDate(new Date()),
        "End Time of Effective Period": excelExpiryDate(vehicle.securityClearanceExpiryDate),
        "Enrollment Date": excelDate(new Date()),
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
      applyDateFormat(worksheet, headers, headerText.length + 1);

      const workbook = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(workbook, worksheet, "Register");
      const excelBuffer = XLSX.write(workbook, { bookType: "xlsx", type: "array" });

      zip.file(`${data.contractor} - ${excelData.length} vehicles request.xlsx`, excelBuffer);

      const zipBlob = await zip.generateAsync({ type: "blob" });
      saveAs(zipBlob, `${data.contractor} - ${excelData.length} vehicles request.zip`);

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
  // The cell components themselves live in components/grid/cells.tsx. Declaring
  // them here would make them a new component type on every render, which
  // remounts the input and loses focus after a single keystroke.
  // Everything the selection layer needs for one cell.
  const cell = (row: number, col: number) => ({
    row, col,
    selected: sheet.isSelected(row, col),
    anchor: sheet.isAnchor(row, col),
    ...sheet.cellHandlers(row, col),
  });

  const cellError = (index: number, name: string) => {
    const error = (errors.vehicles?.[index] as any)?.[name];
    return { invalid: Boolean(error), message: error?.message as string | undefined };
  };

  const headerCell = (label: string, required?: boolean) => (
    <th
      title={label}
      className="h-9 px-3 text-start text-[11.5px] font-semibold text-pch-ink2 bg-white border-b border-e border-pch-line2 sticky top-0 z-20 whitespace-nowrap overflow-hidden text-ellipsis"
    >
      {label}
      {required && <span className="text-pch-stopEdge ms-0.5 font-normal">*</span>}
    </th>
  );

  return (
    <form
      id="sheet-form"
      onSubmit={form.handleSubmit(onSubmit, onInvalid)}
      className="flex-1 min-h-0 flex flex-col"
    >
      <RequestHeader
        title={{
          registration: form.register("contractor"),
          value: shared[0] ?? "",
          placeholder: gridTranslations("contractorPlaceholder"),
          error: errors.contractor?.message as string | undefined,
        }}
        meta={[
          {
            registration: form.register("associatedPetroChinaContractNumber"),
            value: shared[1] ?? "",
            label: gridTranslations("reqContract"),
            placeholder: "PCH-0000-000",
            error: errors.associatedPetroChinaContractNumber?.message as string | undefined,
            icon: FileText,
            mono: true,
          },
          {
            registration: form.register("contractHoldingPetroChinaDepartment"),
            value: shared[2] ?? "",
            label: gridTranslations("reqDepartment"),
            placeholder: gridTranslations("departmentPlaceholder"),
            error: errors.contractHoldingPetroChinaDepartment?.message as string | undefined,
            icon: Building2,
          },
        ]}
      >
        <InstructionsPopover
          title={pageTranslations("title")}
          body={pageTranslations("description")}
        />
      </RequestHeader>

      {/* Document identity and file-level tools belong to the top bar, not to
          the request itself. */}
      <HeaderPortal slot={HEADER_DOC_SLOT}>
        {doc.meta && (
          <span className="inline-flex items-center gap-1.5 h-7 px-2 rounded-md text-[12px] text-pch-ink3">
            <span className="font-mono font-semibold text-pch-ink2">{doc.meta.name}</span>
            {doc.status === "saving" && <span>{gridTranslations("saving")}</span>}
            {doc.status === "saved" && <span className="text-pch-okInk">{gridTranslations("saved")}</span>}
            {doc.status === "partial" && (
              <span className="text-pch-warnInk">{gridTranslations("savedTextOnly")}</span>
            )}
          </span>
        )}
      </HeaderPortal>

      <HeaderPortal slot={HEADER_ACTION_SLOT}>
        <CollaborationControls
          kind="vehicles"
          getSnapshot={() => {
            const values = form.getValues();
            return {
              request: {
                contractor: values.contractor,
                associatedPetroChinaContractNumber:
                  values.associatedPetroChinaContractNumber,
                contractHoldingPetroChinaDepartment:
                  values.contractHoldingPetroChinaDepartment,
              },
              rows: values.vehicles.map((vehicle) => ({
                ...vehicle,
                mediaPhoto: false,
                mediaSenewiyah: false,
                mediaWakala: false,
                mediaArmoredVehicleCertificate: false,
              })) as any,
            };
          }}
        />
              <GenerateZipButton
          formId="sheet-form"
          complete={counts.total > 0 && counts.attention === 0}
          isSubmitting={isSubmitting}
          canSubmit={!collaborative.collaboration || collaborative.collaboration.isOwner}
          label={formTranslations("generateZIP")}
          busyLabel={commonTranslations("generating")}
          restrictedLabel={gridTranslations("ownerOnlyZIP")}
        />
      </HeaderPortal>

      {/* The scroller is absolutely filled so the selection readout can sit in
          the corner without scrolling away with the rows. */}
      <div className="relative flex-1">
        <div
          {...sheet.containerProps}
          className="absolute inset-0 overflow-auto bg-pch-surface outline-none"
        >
        <div ref={gridRef} className="contents">
        <table className="table-fixed w-full min-w-[1320px] border-separate border-spacing-0">
          <colgroup>
            {COLUMN_WIDTHS.map((width, index) => <col key={index} style={{ width }} />)}
          </colgroup>
          <thead>
            <tr>
              <th className="h-9 bg-pch-subtle border-b border-e border-pch-line2 sticky top-0 z-20" />
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
              const complete = collaborative.collaboration
                ? REQUIRED_TEXT_FIELDS.every((key) =>
                    String(row?.[key] ?? "").trim()
                  ) &&
                  collaborative.mediaStatus(index, "photo") &&
                  collaborative.mediaStatus(index, "senewiyah")
                : isRowComplete(row);

              return (
                <tr key={field.id} className="group/row hover:bg-pch-ground/70 transition-colors">
                  <td className="relative p-0 border-b border-e border-pch-line2 bg-pch-subtle/60 text-center align-middle">
                    <span
                      aria-hidden="true"
                      className={cn(
                        "absolute inset-y-0 start-0 w-[2px] transition-colors",
                        rowInvalid ? "bg-pch-stopEdge" : complete ? "bg-pch-okInk/40" : "bg-transparent"
                      )}
                    />
                    <span className={cn(
                      "font-mono text-[11px] tabular-nums group-hover/row:hidden",
                      rowInvalid ? "text-pch-stopInk font-semibold" : "text-pch-ink3/70"
                    )}>
                      {index + 1}
                    </span>
                    {fields.length > 1 && (
                      <button
                        type="button"
                        onClick={() => {
                          if (!collaborative.removeRow(index)) remove(index);
                        }}
                        title={gridTranslations("removeRow")}
                        className="hidden group-hover/row:inline-flex h-5 w-5 items-center justify-center rounded text-pch-ink3 hover:text-pch-stopInk hover:bg-pch-stopBg"
                      >
                        <X className="h-3.5 w-3.5" />
                      </button>
                    )}
                  </td>

                  <TextCell {...form.register(`vehicles.${index}.plateNumber`)} {...cellError(index, "plateNumber")} {...cell(index, 0)} mono />

                  <SelectCell
                    {...form.register(`vehicles.${index}.province`)}
                    {...cellError(index, "province")}
                    {...cell(index, 1)}
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
                  </SelectCell>

                  <TextCell {...form.register(`vehicles.${index}.make`)} {...cellError(index, "make")} {...cell(index, 2)} />
                  <TextCell {...form.register(`vehicles.${index}.model`)} {...cellError(index, "model")} {...cell(index, 3)} />

                  <SelectCell {...form.register(`vehicles.${index}.softskinArmored`)} {...cell(index, 4)}>
                    <option value="Softskin">Softskin</option>
                    <option value="Armored">Armored</option>
                  </SelectCell>

                  <TextCell {...form.register(`vehicles.${index}.senewiyahNumber`)} {...cellError(index, "senewiyahNumber")} {...cell(index, 5)} mono />
                  <TextCell {...form.register(`vehicles.${index}.wakalaNumber`)} {...cellError(index, "wakalaNumber")} {...cell(index, 6)} mono />
                  <TextCell {...form.register(`vehicles.${index}.subcontractor`)} {...cellError(index, "subcontractor")} {...cell(index, 7)} />

                  <CustomCell {...cellError(index, "relatedPersons")} {...cell(index, 8)}>
                    <Controller
                      control={form.control}
                      name={`vehicles.${index}.relatedPersons`}
                      render={({ field }) => (
                        <DriverBadgesCell
                          value={field.value}
                          onChange={field.onChange}
                          invalid={cellError(index, "relatedPersons").invalid}
                        />
                      )}
                    />
                  </CustomCell>

                  <TextCell {...form.register(`vehicles.${index}.eaLetterNumber`)} {...cellError(index, "eaLetterNumber")} {...cell(index, 9)} mono />
                  <TextCell {...form.register(`vehicles.${index}.numberInEaList`)} {...cellError(index, "numberInEaList")} {...cell(index, 10)} mono />

                  <DateCell
                    {...form.register(`vehicles.${index}.securityClearanceExpiryDate`)}
                    {...cell(index, 11)}
                    invalid={cellError(index, "securityClearanceExpiryDate").invalid}
                    message={formatExpiryDate(row?.securityClearanceExpiryDate ?? "") || undefined}
                  />

                  <DocumentTd control={form.control} name={`vehicles.${index}.photo`} label={gridTranslations("colVehiclePhoto")} required {...cell(index, 12)} invalid={cellError(index, "photo").invalid} readOnly={Boolean(collaborative.collaboration && !collaborative.collaboration.isOwner)} uploaded={collaborative.mediaStatus(index, "photo")} />
                  <DocumentTd control={form.control} name={`vehicles.${index}.senewiyah`} label={gridTranslations("colSenewiyahDoc")} required {...cell(index, 13)} invalid={cellError(index, "senewiyah").invalid} readOnly={Boolean(collaborative.collaboration && !collaborative.collaboration.isOwner)} uploaded={collaborative.mediaStatus(index, "senewiyah")} />
                  <DocumentTd control={form.control} name={`vehicles.${index}.wakala`} label={gridTranslations("colWakalaDoc")} {...cell(index, 14)} invalid={cellError(index, "wakala").invalid} readOnly={Boolean(collaborative.collaboration && !collaborative.collaboration.isOwner)} uploaded={collaborative.mediaStatus(index, "wakala")} />
                  <DocumentTd control={form.control} name={`vehicles.${index}.armoredVehicleCertificate`} label={gridTranslations("colArmoredDoc")} {...cell(index, 15)} invalid={cellError(index, "armoredVehicleCertificate").invalid} readOnly={Boolean(collaborative.collaboration && !collaborative.collaboration.isOwner)} uploaded={collaborative.mediaStatus(index, "armoredVehicleCertificate")} />
                </tr>
              );
            })}

            <tr onClick={addVehicle} className="cursor-pointer group/add">
              <td className="border-b border-e border-pch-line2 bg-pch-subtle/60 text-center h-11">
                <Plus className="h-3.5 w-3.5 mx-auto text-pch-ink3/60 group-hover/add:text-pch-accent transition-colors" />
              </td>
              <td colSpan={16} className="border-b border-pch-line px-3 text-[13px] text-pch-ink3/80 group-hover/add:text-pch-accent transition-colors">
                {formTranslations("addVehicle")}
              </td>
            </tr>
          </tbody>
        </table>
        </div>
        </div>

      </div>

      {sheet.menu && (
        <SheetContextMenu
          x={sheet.menu.x}
          y={sheet.menu.y}
          canDeleteRow={fields.length > 1}
          onClose={sheet.closeMenu}
          actions={sheet.menuActions}
        />
      )}

      <SheetFooter
        ready={counts.total - counts.attention}
        total={counts.total}
        selectedCount={sheet.selectedCount}
        isMultiCell={sheet.isMultiCell}
      />
    </form>
  );
}
