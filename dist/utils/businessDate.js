"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getBusinessDateString = getBusinessDateString;
exports.getBusinessMonthString = getBusinessMonthString;
exports.getBusinessDayStart = getBusinessDayStart;
exports.getBusinessDayEnd = getBusinessDayEnd;
exports.getBusinessDayRange = getBusinessDayRange;
exports.getBusinessMonthRange = getBusinessMonthRange;
const BUSINESS_TIMEZONE = 'Asia/Kolkata';
function getBusinessDateString(date = new Date()) {
    return new Intl.DateTimeFormat('en-CA', {
        timeZone: BUSINESS_TIMEZONE,
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
    }).format(date);
}
function getBusinessMonthString(date = new Date()) {
    return new Intl.DateTimeFormat('en-CA', {
        timeZone: BUSINESS_TIMEZONE,
        year: 'numeric',
        month: '2-digit',
    }).format(date);
}
function normalizeBusinessDateString(value) {
    return value.trim().slice(0, 10);
}
function getLocalTimeParts(date) {
    const formatter = new Intl.DateTimeFormat('en-US', {
        timeZone: BUSINESS_TIMEZONE,
        hour: '2-digit',
        minute: '2-digit',
        hour12: false,
    });
    const parts = formatter.formatToParts(date);
    const hour = Number(parts.find((part) => part.type === 'hour')?.value || '0');
    const minute = Number(parts.find((part) => part.type === 'minute')?.value || '0');
    return { hour, minute };
}
function getBusinessDayStart(value = new Date()) {
    const dateString = typeof value === 'string' ? normalizeBusinessDateString(value) : getBusinessDateString(value);
    const [year, month, day] = dateString.split('-').map(Number);
    const businessOffsetMinutes = 5 * 60 + 30;
    let effectiveDate = new Date(Date.UTC(year, month - 1, day, 12, 1, 0) - businessOffsetMinutes * 60 * 1000);
    if (typeof value !== 'string') {
        const localTime = getLocalTimeParts(value);
        if (localTime.hour < 12 || (localTime.hour === 12 && localTime.minute < 1)) {
            effectiveDate = new Date(effectiveDate.getTime() - 24 * 60 * 60 * 1000);
        }
    }
    return effectiveDate;
}
function getBusinessDayEnd(value = new Date()) {
    const dateString = typeof value === 'string' ? normalizeBusinessDateString(value) : getBusinessDateString(value);
    const [year, month, day] = dateString.split('-').map(Number);
    const businessOffsetMinutes = 5 * 60 + 30;
    let effectiveEndDate = new Date(Date.UTC(year, month - 1, day + 1, 11, 59, 0) - businessOffsetMinutes * 60 * 1000);
    if (typeof value !== 'string') {
        const localTime = getLocalTimeParts(value);
        if (localTime.hour < 12 || (localTime.hour === 12 && localTime.minute < 1)) {
            effectiveEndDate = new Date(effectiveEndDate.getTime() - 24 * 60 * 60 * 1000);
        }
    }
    return effectiveEndDate;
}
function getBusinessDayRange(value = new Date()) {
    const start = getBusinessDayStart(value);
    return { start, end: new Date(start.getTime() + 24 * 60 * 60 * 1000) };
}
function getBusinessMonthRange(month) {
    const monthString = normalizeBusinessDateString(month).slice(0, 7);
    const [year, monthNumber] = monthString.split('-').map(Number);
    const lastDay = new Date(Date.UTC(year, monthNumber, 0)).getUTCDate();
    const start = getBusinessDayStart(`${monthString}-01`);
    const end = getBusinessDayEnd(`${monthString}-${String(lastDay).padStart(2, '0')}`);
    return { start, end };
}
