"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.AttendanceService = void 0;
const Attendance_1 = require("../models/Attendance");
const Employee_1 = require("../models/Employee");
class AttendanceService {
    static async list(companyId, employeeId, filters = {}) {
        const query = { companyId };
        if (employeeId)
            query.employeeId = employeeId;
        else if (filters.employeeId)
            query.employeeId = filters.employeeId;
        if (filters.from || filters.to) {
            query.date = {
                ...(filters.from ? { $gte: new Date(filters.from) } : {}),
                ...(filters.to ? { $lte: new Date(`${filters.to}T23:59:59.999Z`) } : {}),
            };
        }
        const records = await Attendance_1.Attendance.find(query).populate('employeeId', 'name employeeId role').sort({ date: -1, checkIn: -1 });
        return records;
    }
    static async employees(companyId) {
        return Employee_1.Employee.find({ companyId, isSuspended: false }).select('_id name employeeId role').sort({ name: 1 });
    }
}
exports.AttendanceService = AttendanceService;
