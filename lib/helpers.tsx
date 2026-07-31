// The app uses "cn" for Chinese, which is not a valid BCP 47 tag - passing it
// straight to Intl throws a RangeError.
export const intlLocale = (locale: string) => (locale === 'cn' ? 'zh-CN' : locale);

// Badges always expire at the end of the working day.
export const EXPIRY_HOUR = 18;
export const EXPIRY_TIME_OF_DAY = '18:00:00';

/**
 * Dates must be real Excel serial numbers carrying this number format. Two
 * things break the import, and both were happening: a formatted string is not
 * a date at all, and any other number format is not understood either - the
 * system falls back to its own default of ten years. This is the format the
 * template documents and the one the files it exports use, so it is the only
 * one known to work. Do not swap it for a friendlier-looking one.
 */
export const EXCEL_DATE_FORMAT = 'yyyy/mm/dd\\ hh:mm:ss';

// Excel's 1900 date system counts from 1899-12-30. Local calendar fields are
// used rather than UTC so the serial matches the date the user picked.
const EXCEL_EPOCH_UTC = Date.UTC(1899, 11, 30);

const toSerial = (
  year: number, month: number, day: number,
  hours = 0, minutes = 0, seconds = 0
) =>
  (Date.UTC(year, month - 1, day) - EXCEL_EPOCH_UTC) / 86_400_000 +
  (hours * 3600 + minutes * 60 + seconds) / 86_400;

/** A moment in time as an Excel serial number, e.g. for the enrollment date. */
export const excelDate = (date: Date) =>
  toSerial(
    date.getFullYear(), date.getMonth() + 1, date.getDate(),
    date.getHours(), date.getMinutes(), date.getSeconds()
  );

/**
 * Turns the `<input type="date">` value (yyyy-mm-dd) into an Excel serial at
 * the end of the working day. Returns "" when no date is set, so the cell is
 * left empty rather than defaulting to 1899.
 */
export const excelExpiryDate = (date: string): number | '' => {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(date ?? '');
  if (!match) return '';
  const [, yyyy, mm, dd] = match;
  return toSerial(Number(yyyy), Number(mm), Number(dd), EXPIRY_HOUR);
};

/**
 * The expiry as it will appear in the workbook, shown under the date field so
 * the user sees exactly what gets written. It deliberately mirrors
 * EXCEL_DATE_FORMAT - if that changes, this has to change with it.
 */
export const formatExpiryDate = (date: string) => {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(date ?? '');
  if (!match) return '';
  const [, yyyy, mm, dd] = match;
  return `${yyyy}/${mm}/${dd} ${EXPIRY_TIME_OF_DAY}`;
};
