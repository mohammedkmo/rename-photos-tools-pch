import * as XLSX from "xlsx-js-style";
import { EXCEL_DATE_FORMAT } from "@/lib/helpers";

/** Columns the badging system parses as dates rather than text. */
const DATE_COLUMNS = [
  "Start Time of Effective Period",
  "End Time of Effective Period",
  "Enrollment Date",
];

/**
 * Tags the date columns with a date number format. The cells already hold
 * Excel serial numbers (see excelDate); this is what makes them render as
 * dates instead of five-digit numbers when the file is opened.
 */
export function applyDateFormat(
  worksheet: XLSX.WorkSheet,
  headers: string[],
  firstDataRow: number
) {
  const range = XLSX.utils.decode_range(worksheet["!ref"] ?? "A1");

  headers.forEach((header, column) => {
    if (!DATE_COLUMNS.includes(header)) return;

    for (let row = firstDataRow; row <= range.e.r; row += 1) {
      const cell = worksheet[XLSX.utils.encode_cell({ r: row, c: column })];
      // Rows with no expiry set stay empty rather than becoming 1899.
      if (cell?.t === "n") cell.z = EXCEL_DATE_FORMAT;
    }
  });
}

// Define styles
export const headerStyle = {
    font: { bold: true },
    fill: { fgColor: { rgb: "D3D3D3" } },
    border: {
      top: { style: "thin", color: { rgb: "000000" } },
      bottom: { style: "thin", color: { rgb: "000000" } },
      left: { style: "thin", color: { rgb: "000000" } },
      right: { style: "thin", color: { rgb: "000000" } },
    },
  };
  
  export const cellStyle = {
    border: {
      top: { style: "thin", color: { rgb: "000000" } },
      bottom: { style: "thin", color: { rgb: "000000" } },
      left: { style: "thin", color: { rgb: "000000" } },
      right: { style: "thin", color: { rgb: "000000" } },
    },
  };