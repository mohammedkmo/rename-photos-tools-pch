"use client";

import { useEffect, useMemo, useRef } from "react";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm, useFieldArray, useWatch, type FieldErrors } from "react-hook-form";
import JSZip from "jszip";
import { saveAs } from "file-saver";
import XLSX from "xlsx-js-style";
import { Building2, FileText, Plus, X } from "lucide-react";
import { useLocale, useTranslations } from "next-intl";

import { FormValues, EmployeeValues, formSchema } from "@/schema/employee";
import { nationalities } from "@/data/nationalities";
import { formatDate, formatExpiryDate } from "@/lib/helpers";
import { toJpeg } from "@/lib/images";
import { useDocument } from "@/hooks/use-document";
import { toast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";
import { TextCell, SelectCell, DateCell, DocumentTd } from "@/components/grid/cells";
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

const EMPTY_EMPLOYEE: EmployeeValues = {
  id: "",
  firstName: "",
  lastName: "",
  position: "",
  idDocumentNumber: "",
  nationality: "",
  subcontractor: "",
  eaLetterNumber: "",
  numberInEaList: "",
  securityClearanceExpiryDate: "",
  photo: null as unknown as File,
  idDocument: null as unknown as File,
  drivingLicense: undefined,
  moiCard: undefined,
};

// Percentages so the sheet fills whatever screen it is on. They must total 100.
const COLUMN_WIDTHS = [
  "3%",
  "8%", "7.5%", "7.5%", "9.5%",
  "9.5%", "7.5%",
  "9.5%",
  "6%", "6%", "8%",
  "4.5%", "4.5%", "4.5%", "4.5%",
];

// Column order for the selection layer. `null` marks a column the clipboard
// cannot fill, because its value is a file rather than text.
const COLUMN_KEYS: (keyof EmployeeValues | null)[] = [
  "id", "firstName", "lastName", "position",
  "idDocumentNumber", "nationality", "subcontractor",
  "eaLetterNumber", "numberInEaList", "securityClearanceExpiryDate",
  null, null, null, null,
];

const REQUIRED_TEXT_FIELDS = [
  "id", "firstName", "lastName", "position",
  "idDocumentNumber", "nationality", "eaLetterNumber",
  "numberInEaList", "securityClearanceExpiryDate",
] as const;

const PERSONAL_TEXT_FIELDS = [
  "id", "firstName", "lastName", "position", "idDocumentNumber",
  "nationality", "subcontractor", "eaLetterNumber", "numberInEaList",
  "securityClearanceExpiryDate",
];

const PERSONAL_MEDIA_FIELDS: Record<string, keyof SharedRow> = {
  photo: "mediaPhoto",
  idDocument: "mediaIdDocument",
  drivingLicense: "mediaDrivingLicense",
  moiCard: "mediaMoiCard",
};

const isRowComplete = (employee?: Partial<EmployeeValues>) =>
  Boolean(
    employee &&
    REQUIRED_TEXT_FIELDS.every((key) => String(employee[key] ?? "").trim()) &&
    employee.photo &&
    employee.idDocument
  );

export default function PersonalBadgeForm({ documentId }: { documentId?: string }) {
  const locale = useLocale();
  const formTranslations = useTranslations("personalBadge.form");
  const gridTranslations = useTranslations("grid");
  const pageTranslations = useTranslations("personalBadge");
  const commonTranslations = useTranslations("common");

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema(formTranslations)),
    mode: "onTouched",
    defaultValues: {
      contractor: "",
      associatedPetroChinaContractNumber: "",
      contractHoldingPetroChinaDepartment: "",
      employees: [EMPTY_EMPLOYEE],
    },
  });

  const { fields, append, insert, remove, replace } = useFieldArray({ name: "employees", control: form.control });
  const employees = useWatch({ control: form.control, name: "employees" });
  const shared = useWatch({
    control: form.control,
    name: ["contractor", "associatedPetroChinaContractNumber", "contractHoldingPetroChinaDepartment"],
  });
  const { errors, isSubmitting } = form.formState;
  const gridRef = useRef<HTMLDivElement>(null);
  const collaborative = useCollaborativeForm({
    form,
    arrayName: "employees",
    emptyRow: EMPTY_EMPLOYEE,
    textFields: PERSONAL_TEXT_FIELDS,
    mediaFields: PERSONAL_MEDIA_FIELDS,
    replaceRows: replace,
  });

  const sheet = useSheet({
    rowCount: fields.length,
    columnKeys: COLUMN_KEYS as (string | null)[],
    readCell: (row, col) =>
      String(form.getValues(`employees.${row}.${COLUMN_KEYS[col]}` as any) ?? ""),
    writeCell: (row, col, value) =>
      form.setValue(`employees.${row}.${COLUMN_KEYS[col]}` as any, value, {
        shouldDirty: true,
        shouldValidate: true,
      }),
    ensureRows: (count) => {
      if (collaborative.ensureRows(count)) return;
      const missing = count - form.getValues("employees").length;
      if (missing > 0) append(Array.from({ length: missing }, () => ({ ...EMPTY_EMPLOYEE })));
    },
    insertRow: (at) => {
      if (!collaborative.addRow(at)) insert(at, { ...EMPTY_EMPLOYEE });
    },
    deleteRow: (at) => {
      if (!collaborative.removeRow(at)) remove(at);
    },
    onSelectionChange: collaborative.setSelection,
  });

  const doc = useDocument<FormValues>({
    id: documentId ?? null,
    kind: "personal",
    form,
    arrayName: "employees",
    enabled: !collaborative.collaboration,
  });

  const counts = useMemo(() => {
    const rows = (employees ?? []) as Partial<EmployeeValues>[];
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
          collaborative.mediaStatus(index, "idDocument")
          : Boolean(row?.photo && row?.idDocument);
        return !(textReady && mediaReady);
      }).length,
    };
  }, [collaborative, employees]);

  const addEmployee = () => {
    if (!collaborative.addRow()) append({ ...EMPTY_EMPLOYEE });
    // Let the new row render before scrolling to it.
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
      const idDocsFolder = zip.folder("ID Documents");
      const drivingLicensesFolder = zip.folder("Driving Licences");
      const moiCardsFolder = zip.folder("MOI Cards");

      // The badging system only reads JPEG, so anything uploaded as PNG or GIF
      // is re-encoded rather than just renamed.
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

      const excelData = data.employees.map((employee) => ({
        "ID": `HFYC${employee.id}`,
        "First Name": employee.firstName,
        "Last Name": employee.lastName,
        "Department": `HALFAYA/Contractor/${data.contractor}`,
        "Start Time of Effective Period": formatDate(new Date()),
        "End Time of Effective Period": formatExpiryDate(employee.securityClearanceExpiryDate),
        "Enrollment Date": formatDate(new Date()),
        "Type": "Basic Person",
        "Company Name": data.contractor,
        "Subcontractor Name": employee.subcontractor,
        "ID Document Number": employee.idDocumentNumber,
        "Nationality": employee.nationality,
        "Associated PCH Contract Number": data.associatedPetroChinaContractNumber,
        "Contract Holding PCH Department": data.contractHoldingPetroChinaDepartment,
        "Comments": "",
        "EA Letter Number": employee.eaLetterNumber,
        "Number in EA List": employee.numberInEaList,
        "Access Revoked": "NO",
        "Position-": employee.position,
        "Sponsor Badge": "NO",
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
        ["It supports editing the persons' additional information in a batch, the fields of which are already created in the system. Please enter the additional information according to the type. For single selection type, select one from the drop-down list."]
      ];

      const headers = [
        "ID", "First Name", "Last Name", "Department",
        "Start Time of Effective Period", "End Time of Effective Period",
        "Enrollment Date", "Type", "Company Name", "Subcontractor Name",
        "ID Document Number", "Nationality", "Associated PCH Contract Number",
        "Contract Holding PCH Department", "Comments", "EA Letter Number",
        "Number in EA List", "Access Revoked", "Position-", "Sponsor Badge",
      ];

      const combinedData = [...headerText, headers, ...excelData.map(Object.values)];
      const worksheet = XLSX.utils.aoa_to_sheet(combinedData);
      worksheet["!cols"] = headers.map((header) => ({ wch: header.length + 10 }));

      const workbook = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(workbook, worksheet, "Register");
      const excelBuffer = XLSX.write(workbook, { bookType: "xlsx", type: "array" });

      zip.file(`${data.contractor} - ${excelData.length} employees request.xlsx`, excelBuffer);

      const zipBlob = await zip.generateAsync({ type: "blob" });
      saveAs(zipBlob, `${data.contractor} - ${excelData.length} employees request.zip`);

      toast({
        title: formTranslations("createZIPSuccess"),
        description: formTranslations("createZIPSuccessDescription"),
      });

      await fetch("/api/log", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          requestType: "Personal Badge",
          message: `New request submitted by ${data.contractor} for ${data.employees.length} employee(s).`,
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
    const error = (errors.employees?.[index] as any)?.[name];
    return { invalid: Boolean(error), message: error?.message as string | undefined };
  };

  const headerCell = (label: string, required?: boolean) => (
    <th
      title={label}
      className="h-9 px-3 text-start text-[11.5px] font-semibold text-pch-ink2 bg-pch-surface border-b border-e border-pch-line2 sticky top-0 z-20 whitespace-nowrap overflow-hidden text-ellipsis"
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
          kind="personal"
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
              rows: values.employees.map((employee) => ({
                ...employee,
                // Entering a room reloads the page; browser File objects cannot
                // survive that boundary, so media starts clean and is reattached
                // by the owner inside the collaborative sheet.
                mediaPhoto: false,
                mediaIdDocument: false,
                mediaDrivingLicense: false,
                mediaMoiCard: false,
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
            <table className="table-fixed w-full min-w-[1180px] border-separate border-spacing-0">
              <colgroup>
                {COLUMN_WIDTHS.map((width, index) => <col key={index} style={{ width }} />)}
              </colgroup>
              <thead>
                <tr>
                  <th className="h-9 bg-pch-subtle border-b border-e border-pch-line2 sticky top-0 z-20" />
                  {headerCell(gridTranslations("colBadge"), true)}
                  {headerCell(gridTranslations("colFirstName"), true)}
                  {headerCell(gridTranslations("colLastName"), true)}
                  {headerCell(gridTranslations("colPosition"), true)}
                  {headerCell(gridTranslations("colIdDocument"), true)}
                  {headerCell(gridTranslations("colNationality"), true)}
                  {headerCell(gridTranslations("colSubcontractor"))}
                  {headerCell(gridTranslations("colEaLetter"), true)}
                  {headerCell(gridTranslations("colEaList"), true)}
                  {headerCell(gridTranslations("colExpires"), true)}
                  {headerCell(gridTranslations("colPhoto"), true)}
                  {headerCell(gridTranslations("colId"), true)}
                  {headerCell(gridTranslations("colLicence"))}
                  {headerCell(gridTranslations("colMoi"))}
                </tr>
              </thead>

              <tbody>
                {fields.map((field, index) => {
                  const row = employees?.[index] as Partial<EmployeeValues> | undefined;
                  const rowInvalid = Boolean(errors.employees?.[index]);
                  const complete = collaborative.collaboration
                    ? REQUIRED_TEXT_FIELDS.every((key) =>
                      String(row?.[key] ?? "").trim()
                    ) &&
                    collaborative.mediaStatus(index, "photo") &&
                    collaborative.mediaStatus(index, "idDocument")
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

                      <TextCell {...form.register(`employees.${index}.id`)} {...cellError(index, "id")} {...cell(index, 0)} mono prefix="HFYC-" digitsOnly maxLength={4} inputMode="numeric" placeholder="0000" />
                      <TextCell {...form.register(`employees.${index}.firstName`)} {...cellError(index, "firstName")} {...cell(index, 1)} />
                      <TextCell {...form.register(`employees.${index}.lastName`)} {...cellError(index, "lastName")} {...cell(index, 2)} />
                      <TextCell {...form.register(`employees.${index}.position`)} {...cellError(index, "position")} {...cell(index, 3)} />
                      <TextCell {...form.register(`employees.${index}.idDocumentNumber`)} {...cellError(index, "idDocumentNumber")} {...cell(index, 4)} mono />

                      <SelectCell
                        {...form.register(`employees.${index}.nationality`)}
                        {...cellError(index, "nationality")}
                        {...cell(index, 5)}
                      >
                        <option value="" />
                        {nationalities.map((nationality) => (
                          <option key={nationality.num_code} value={nationality.nationality}>
                            {locale === "ar"
                              ? nationality.nationality_ar
                              : locale === "cn"
                                ? nationality.nationality_cn
                                : nationality.nationality}
                          </option>
                        ))}
                      </SelectCell>

                      <TextCell {...form.register(`employees.${index}.subcontractor`)} {...cellError(index, "subcontractor")} {...cell(index, 6)} />
                      <TextCell {...form.register(`employees.${index}.eaLetterNumber`)} {...cellError(index, "eaLetterNumber")} {...cell(index, 7)} mono />
                      <TextCell {...form.register(`employees.${index}.numberInEaList`)} {...cellError(index, "numberInEaList")} {...cell(index, 8)} mono />

                      <DateCell
                        {...form.register(`employees.${index}.securityClearanceExpiryDate`)}
                        {...cell(index, 9)}
                        invalid={cellError(index, "securityClearanceExpiryDate").invalid}
                        message={formatExpiryDate(row?.securityClearanceExpiryDate ?? "") || undefined}
                      />

                      <DocumentTd control={form.control} name={`employees.${index}.photo`} label={formTranslations("photo")} required {...cell(index, 10)} invalid={cellError(index, "photo").invalid} readOnly={Boolean(collaborative.collaboration && !collaborative.collaboration.isOwner)} uploaded={collaborative.mediaStatus(index, "photo")} />
                      <DocumentTd control={form.control} name={`employees.${index}.idDocument`} label={formTranslations("idDocument")} required {...cell(index, 11)} invalid={cellError(index, "idDocument").invalid} readOnly={Boolean(collaborative.collaboration && !collaborative.collaboration.isOwner)} uploaded={collaborative.mediaStatus(index, "idDocument")} />
                      <DocumentTd control={form.control} name={`employees.${index}.drivingLicense`} label={formTranslations("drivingLicense")} {...cell(index, 12)} invalid={cellError(index, "drivingLicense").invalid} readOnly={Boolean(collaborative.collaboration && !collaborative.collaboration.isOwner)} uploaded={collaborative.mediaStatus(index, "drivingLicense")} />
                      <DocumentTd control={form.control} name={`employees.${index}.moiCard`} label={formTranslations("moiCard")} {...cell(index, 13)} invalid={cellError(index, "moiCard").invalid} readOnly={Boolean(collaborative.collaboration && !collaborative.collaboration.isOwner)} uploaded={collaborative.mediaStatus(index, "moiCard")} />
                    </tr>
                  );
                })}

                <tr onClick={addEmployee} className="cursor-pointer group/add">
                  <td className="border-b border-e border-pch-line2 bg-pch-subtle/60 text-center h-11">
                    <Plus className="h-3.5 w-3.5 mx-auto text-pch-ink3/60 group-hover/add:text-pch-accent transition-colors" />
                  </td>
                  <td colSpan={14} className="border-b border-pch-line px-3 text-[13px] text-pch-ink3/80 group-hover/add:text-pch-accent transition-colors">
                    {formTranslations("addEmployee")}
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
