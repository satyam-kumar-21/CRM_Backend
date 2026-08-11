const BUSINESS_TIMEZONE = 'Asia/Kolkata';

export function getBusinessDateString(date = new Date()) {
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: BUSINESS_TIMEZONE,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(date);
}

export function getBusinessMonthString(date = new Date()) {
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: BUSINESS_TIMEZONE,
    year: 'numeric',
    month: '2-digit',
  }).format(date);
}

function normalizeBusinessDateString(value: string) {
  return value.trim().slice(0, 10);
}

export function getBusinessDayStart(value: string | Date = new Date()) {
  const dateString = typeof value === 'string' ? normalizeBusinessDateString(value) : getBusinessDateString(value);
  const [year, month, day] = dateString.split('-').map(Number);
  const businessOffsetMinutes = 5 * 60 + 30;
  // Business day starts at 12:01 PM local (Asia/Kolkata) for the given calendar date
  // Compute UTC time for local 12:01 and subtract timezone offset to get actual UTC timestamp
  return new Date(Date.UTC(year, month - 1, day, 12, 1, 0) - businessOffsetMinutes * 60 * 1000);
}

export function getBusinessDayEnd(value: string | Date = new Date()) {
  const dateString = typeof value === 'string' ? normalizeBusinessDateString(value) : getBusinessDateString(value);
  const [year, month, day] = dateString.split('-').map(Number);
  const businessOffsetMinutes = 5 * 60 + 30;
  // Business day end is next day 11:59 AM local (Asia/Kolkata)
  return new Date(Date.UTC(year, month - 1, day + 1, 11, 59, 0) - businessOffsetMinutes * 60 * 1000);
}

export function getBusinessDayRange(value: string | Date = new Date()) {
  const start = getBusinessDayStart(value);
  return { start, end: new Date(start.getTime() + 24 * 60 * 60 * 1000) };
}

export function getBusinessMonthRange(month: string) {
  const monthString = normalizeBusinessDateString(month).slice(0, 7);
  const [year, monthNumber] = monthString.split('-').map(Number);
  const lastDay = new Date(Date.UTC(year, monthNumber, 0)).getUTCDate();
  const start = getBusinessDayStart(`${monthString}-01`);
  const end = getBusinessDayEnd(`${monthString}-${String(lastDay).padStart(2, '0')}`);
  return { start, end };
}
