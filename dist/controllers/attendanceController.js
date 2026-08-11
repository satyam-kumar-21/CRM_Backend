"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.AttendanceController = void 0;
const responseHandler_1 = require("../utils/responseHandler");
const attendanceService_1 = require("../services/attendanceService");
const index_1 = require("../constants/index");
class AttendanceController {
    static async list(req, res, next) {
        try {
            const isAdmin = req.user.role === index_1.Roles.COMPANY_ADMIN;
            const records = await attendanceService_1.AttendanceService.list(req.user.companyId, isAdmin ? undefined : req.user.id, {
                employeeId: isAdmin ? req.query.employeeId : undefined,
                from: req.query.from,
                to: req.query.to,
            });
            responseHandler_1.ApiResponse.success(res, 'Attendance fetched successfully', records);
        }
        catch (error) {
            next(error);
        }
    }
    static async employees(req, res, next) {
        try {
            responseHandler_1.ApiResponse.success(res, 'Attendance employees fetched successfully', await attendanceService_1.AttendanceService.employees(req.user.companyId));
        }
        catch (error) {
            next(error);
        }
    }
}
exports.AttendanceController = AttendanceController;
