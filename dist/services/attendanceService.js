"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.AttendanceService = void 0;
const Attendance_1 = require("../models/Attendance");
const Employee_1 = require("../models/Employee");
const businessDate_1 = require("../utils/businessDate");
const Company_1 = require("../models/Company");
const index_1 = require("../constants/index");
class AttendanceService {
    static async list(companyId, employeeId, filters = {}) {
        const query = { companyId };
        if (employeeId)
            query.employeeId = employeeId;
        else if (filters.employeeId)
            query.employeeId = filters.employeeId;
        if (filters.from || filters.to) {
            query.date = {
                ...(filters.from ? { $gte: (0, businessDate_1.getBusinessDayStart)(filters.from) } : {}),
                ...(filters.to ? { $lt: (0, businessDate_1.getBusinessDayEnd)(filters.to) } : {}),
            };
        }
        const records = await Attendance_1.Attendance.find(query).populate('employeeId', 'name employeeId role').sort({ date: -1, checkIn: -1 });
        // Handle company-configured holidays: treat them as HOLIDAY status for employee-specific queries
        const company = await Company_1.Company.findById(companyId).select('settings');
        const holidays = (company && company.settings && Array.isArray(company.settings.holidays)) ? company.settings.holidays : [];
        const employeeToCheck = (employeeId || filters.employeeId);
        if (employeeToCheck) {
            for (const h of holidays) {
                if (!h || !h.date)
                    continue;
                const start = (0, businessDate_1.getBusinessDayStart)(h.date);
                const end = (0, businessDate_1.getBusinessDayEnd)(h.date);
                // If filters provided, skip holidays outside range
                if (filters.from && new Date(String(filters.from)) > end)
                    continue;
                if (filters.to && new Date(String(filters.to)) < start)
                    continue;
                const exists = records.find((r) => r.employeeId && String(r.employeeId._id || r.employeeId) === employeeToCheck && r.date >= start && r.date < end);
                if (exists) {
                    exists.status = index_1.AttendanceStatus.HOLIDAY;
                }
                else {
                    records.push({
                        companyId: companyId,
                        employeeId: employeeToCheck,
                        date: start,
                        checkIn: undefined,
                        checkOut: undefined,
                        status: index_1.AttendanceStatus.HOLIDAY,
                        workHours: 0,
                    });
                }
            }
        }
        // sort again by date desc
        records.sort((a, b) => b.date.getTime() - a.date.getTime());
        return records;
    }
    static async employees(companyId) {
        return Employee_1.Employee.find({ companyId, isSuspended: false }).select('_id name employeeId role').sort({ name: 1 });
    }
}
exports.AttendanceService = AttendanceService;
