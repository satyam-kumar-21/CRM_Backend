"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.AttendanceService = void 0;
const Attendance_1 = require("../models/Attendance");
const Employee_1 = require("../models/Employee");
const businessDate_1 = require("../utils/businessDate");
const Company_1 = require("../models/Company");
const index_1 = require("../constants/index");
const toDateKey = (value) => {
    const raw = value instanceof Date ? value : new Date(value);
    if (Number.isNaN(raw.getTime()))
        return '';
    return (0, businessDate_1.getBusinessDateString)(raw);
};
const buildDateRange = (from, to) => {
    const today = new Date();
    const startDate = from ? new Date(from) : today;
    const endDate = to ? new Date(to) : today;
    if (from && to && startDate > endDate) {
        return { start: endDate, end: startDate };
    }
    if (!from && !to) {
        const currentMonth = (0, businessDate_1.getBusinessMonthString)();
        const { start } = (0, businessDate_1.getBusinessMonthRange)(currentMonth);
        return { start, end: (0, businessDate_1.getBusinessDayEnd)(today) };
    }
    if (from && !to) {
        const monthKey = (0, businessDate_1.getBusinessMonthString)(from);
        const currentMonth = (0, businessDate_1.getBusinessMonthString)();
        if (monthKey === currentMonth) {
            return { start: (0, businessDate_1.getBusinessDayStart)(from), end: (0, businessDate_1.getBusinessDayEnd)(today) };
        }
    }
    const start = from ? (0, businessDate_1.getBusinessDayStart)(from) : (0, businessDate_1.getBusinessDayStart)(startDate);
    const end = to ? (0, businessDate_1.getBusinessDayEnd)(to) : (0, businessDate_1.getBusinessDayEnd)(endDate);
    return { start, end };
};
class AttendanceService {
    static async list(companyId, employeeId, filters = {}) {
        const query = { companyId };
        const targetEmployeeId = employeeId || filters.employeeId;
        if (targetEmployeeId)
            query.employeeId = targetEmployeeId;
        const company = await Company_1.Company.findById(companyId).select('settings');
        const holidays = Array.isArray(company?.settings?.holidays) ? company.settings.holidays.filter(Boolean) : [];
        const holidayByKey = new Map();
        for (const item of holidays) {
            if (!item?.date)
                continue;
            holidayByKey.set(toDateKey(item.date), item);
        }
        const range = buildDateRange(filters.from, filters.to);
        if (filters.from || filters.to) {
            query.date = {
                ...(filters.from ? { $gte: (0, businessDate_1.getBusinessDayStart)(filters.from) } : {}),
                ...(filters.to ? { $lt: (0, businessDate_1.getBusinessDayEnd)(filters.to) } : {}),
            };
        }
        else {
            query.date = {
                $gte: range.start,
                $lt: range.end,
            };
        }
        const employeeDocs = await Employee_1.Employee.find({ companyId, isSuspended: false }).select('_id name employeeId role createdAt').sort({ name: 1 });
        const employeeIds = targetEmployeeId ? [targetEmployeeId] : employeeDocs.map((employee) => employee._id.toString());
        const employeeById = new Map(employeeDocs.map((employee) => [employee._id.toString(), employee]));
        const holidayDatesInRange = new Set();
        for (const [dateKey] of holidayByKey.entries()) {
            const date = new Date(dateKey);
            if (!Number.isNaN(date.getTime()) && date >= range.start && date < range.end) {
                holidayDatesInRange.add(dateKey);
            }
        }
        const existingRecords = await Attendance_1.Attendance.find(query).populate('employeeId', 'name employeeId role').sort({ date: 1, checkIn: 1 });
        const recordMap = new Map();
        for (const record of existingRecords) {
            const employeeKey = record.employeeId ? String(record.employeeId._id || record.employeeId) : String(record.employeeId);
            const dateKey = toDateKey(record.date);
            if (!employeeKey || !dateKey)
                continue;
            recordMap.set(`${employeeKey}:${dateKey}`, record);
        }
        const allRecords = [];
        for (const employee of employeeIds) {
            const employeeProfile = employeeById.get(employee);
            const employeeJoinDate = employeeProfile?.createdAt ? new Date(employeeProfile.createdAt) : range.start;
            const dayCursor = new Date(Math.max(range.start.getTime(), (0, businessDate_1.getBusinessDayStart)(employeeJoinDate).getTime()));
            while (dayCursor < range.end) {
                const dateKey = toDateKey(dayCursor);
                const key = `${employee}:${dateKey}`;
                const existing = recordMap.get(key);
                const holiday = holidayByKey.get(dateKey);
                if (holiday) {
                    const holidayRecord = existing || {
                        _id: `${employee}-${dateKey}`,
                        companyId,
                        employeeId: employee,
                        date: (0, businessDate_1.getBusinessDayStart)(dateKey),
                        checkIn: undefined,
                        checkOut: undefined,
                        status: index_1.AttendanceStatus.HOLIDAY,
                        workHours: 0,
                    };
                    holidayRecord.status = index_1.AttendanceStatus.HOLIDAY;
                    holidayRecord.checkIn = existing?.checkIn ?? undefined;
                    holidayRecord.checkOut = existing?.checkOut ?? undefined;
                    holidayRecord.workHours = existing?.workHours ?? 0;
                    holidayRecord.employeeId = existing?.employeeId ?? employee;
                    allRecords.push(holidayRecord);
                }
                else if (existing) {
                    allRecords.push(existing);
                }
                else {
                    allRecords.push({
                        _id: `${employee}-${dateKey}`,
                        companyId,
                        employeeId: employee,
                        date: (0, businessDate_1.getBusinessDayStart)(dateKey),
                        checkIn: undefined,
                        checkOut: undefined,
                        status: index_1.AttendanceStatus.ABSENT,
                        workHours: 0,
                    });
                }
                dayCursor.setUTCDate(dayCursor.getUTCDate() + 1);
            }
        }
        const records = allRecords.map((record) => {
            const employeeIdString = typeof record.employeeId === 'object' && record.employeeId ? String(record.employeeId._id || record.employeeId) : String(record.employeeId || '');
            const employeeProfile = employeeById.get(employeeIdString);
            if (record.employeeId && typeof record.employeeId === 'object' && record.employeeId._id) {
                return record;
            }
            if (employeeProfile) {
                return { ...record, employeeId: employeeProfile.toObject ? employeeProfile.toObject() : employeeProfile };
            }
            if (record.employeeId && typeof record.employeeId === 'string') {
                return { ...record, employeeId: { _id: record.employeeId, name: '', employeeId: '', role: '' } };
            }
            return record;
        });
        records.sort((a, b) => {
            const left = new Date(a.date).getTime();
            const right = new Date(b.date).getTime();
            return right - left;
        });
        const summary = {
            totalWorkingDays: records.filter((record) => record.status !== index_1.AttendanceStatus.HOLIDAY).length,
            totalPresent: records.filter((record) => record.status === index_1.AttendanceStatus.PRESENT).length,
            totalAbsent: records.filter((record) => record.status === index_1.AttendanceStatus.ABSENT).length,
            totalHoliday: holidayDatesInRange.size,
            totalEmployees: employeeIds.length,
            from: range.start.toISOString(),
            to: range.end.toISOString(),
        };
        return { records, summary };
    }
    static async employees(companyId) {
        return Employee_1.Employee.find({ companyId, isSuspended: false }).select('_id name employeeId role').sort({ name: 1 });
    }
}
exports.AttendanceService = AttendanceService;
