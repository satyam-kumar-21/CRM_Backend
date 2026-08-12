"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getBusinessDateString = getBusinessDateString;
exports.getBusinessMonthString = getBusinessMonthString;
exports.getBusinessDayStart = getBusinessDayStart;
exports.getBusinessDayEnd = getBusinessDayEnd;
exports.getBusinessDayRange = getBusinessDayRange;
exports.getBusinessMonthRange = getBusinessMonthRange;
const BUSINESS_TIMEZONE = 'Asia/Kolkata';
function getBusinessDateString(value = new Date()) {
    const d = typeof value === 'string' ? new Date(value) : value;
    if (isNaN(d.getTime()))
        return '';
    const formatter = new Intl.DateTimeFormat('en-US', {
        timeZone: BUSINESS_TIMEZONE,
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
        hour: '2-digit',
        hour12: false,
    });
    const parts = formatter.formatToParts(d);
    const year = Number(parts.find((p) => p.type === 'year')?.value);
    const month = Number(parts.find((p) => p.type === 'month')?.value);
    const day = Number(parts.find((p) => p.type === 'day')?.value);
    const hour = Number(parts.find((p) => p.type === 'hour')?.value || '0');
    const localDate = new Date(Date.UTC(year, month - 1, day));
    if (hour < 12) {
        localDate.setUTCDate(localDate.getUTCDate() - 1);
    }
    const bYear = localDate.getUTCFullYear();
    const bMonth = String(localDate.getUTCMonth() + 1).padStart(2, '0');
    const bDay = String(localDate.getUTCDate()).padStart(2, '0');
    return `${bYear}-${bMonth}-${bDay}`;
}
function getBusinessMonthString(value = new Date()) {
    const dateStr = getBusinessDateString(value);
    return dateStr.slice(0, 7);
}
function normalizeBusinessDateString(value) {
    return value.trim().slice(0, 10);
}
function getBusinessDayStart(value = new Date()) {
    const dateString = typeof value === 'string' ? normalizeBusinessDateString(value) : getBusinessDateString(value);
    const [year, month, day] = dateString.split('-').map(Number);
    // 12:00 PM IST is 06:30:00 UTC (IST is UTC+5:30)
    return new Date(Date.UTC(year, month - 1, day, 6, 30, 0, 0));
}
function getBusinessDayEnd(value = new Date()) {
    const dateString = typeof value === 'string' ? normalizeBusinessDateString(value) : getBusinessDateString(value);
    const [year, month, day] = dateString.split('-').map(Number);
    // 11:59:59.999 AM IST next day is 06:29:59.999 UTC next day
    return new Date(Date.UTC(year, month - 1, day + 1, 6, 29, 59, 999));
}
function getBusinessDayRange(value = new Date()) {
    return { start: getBusinessDayStart(value), end: getBusinessDayEnd(value) };
}
function getBusinessMonthRange(month) {
    const monthString = normalizeBusinessDateString(month).slice(0, 7);
    const [year, monthNumber] = monthString.split('-').map(Number);
    const lastDay = new Date(Date.UTC(year, monthNumber, 0)).getUTCDate();
    const start = getBusinessDayStart(`${monthString}-01`);
    const end = getBusinessDayEnd(`${monthString}-${String(lastDay).padStart(2, '0')}`);
    return { start, end };
}
