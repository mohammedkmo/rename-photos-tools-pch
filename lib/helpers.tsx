export const formatDate = (date: Date) => {
    const yyyy = date.getFullYear();
    const mm = String(date.getMonth() + 1).padStart(2, '0');
    const dd = String(date.getDate()).padStart(2, '0');
    const hh = String(date.getHours()).padStart(2, '0');
    const min = String(date.getMinutes()).padStart(2, '0');
    const ss = String(date.getSeconds()).padStart(2, '0');
    return `${yyyy}/${mm}/${dd} ${hh}:${min}:${ss}`;
  };

// The app uses "cn" for Chinese, which is not a valid BCP 47 tag - passing it
// straight to Intl throws a RangeError.
export const intlLocale = (locale: string) => (locale === 'cn' ? 'zh-CN' : locale);

// Badges always expire at the end of the working day.
export const EXPIRY_TIME_OF_DAY = '6:00:00 PM';

// Turns the `<input type="date">` value (yyyy-mm-dd) into the format the
// access control system expects, e.g. "26/07/2026  6:00:00 PM".
export const formatExpiryDate = (date: string) => {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(date ?? '');
  if (!match) return '';
  const [, yyyy, mm, dd] = match;
  return `${dd}/${mm}/${yyyy}  ${EXPIRY_TIME_OF_DAY}`;
};

// Inverse of formatExpiryDate, used when re-importing a generated ZIP.
export const parseExpiryDate = (value: unknown) => {
  const match = /^(\d{2})\/(\d{2})\/(\d{4})/.exec(String(value ?? '').trim());
  if (!match) return '';
  const [, dd, mm, yyyy] = match;
  return `${yyyy}-${mm}-${dd}`;
};
