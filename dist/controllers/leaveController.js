"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.LeaveController = void 0;
const responseHandler_1 = require("../utils/responseHandler");
const Leave_1 = require("../models/Leave");
const index_1 = require("../constants/index");
class LeaveController {
    static async list(req, res, next) {
        try {
            const isAdmin = req.user.role === index_1.Roles.COMPANY_ADMIN;
            const query = { companyId: req.user.companyId };
            if (!isAdmin)
                query.employeeId = req.user.id;
            if (req.query.month) {
                const month = String(req.query.month);
                query.startDate = { $gte: new Date(`${month}-01`), $lt: new Date(`${month}-31T23:59:59.999Z`) };
            }
            const records = await Leave_1.Leave.find(query).populate('employeeId', 'name employeeId role').sort({ startDate: -1 });
            responseHandler_1.ApiResponse.success(res, 'Leave records fetched successfully', records);
        }
        catch (error) {
            next(error);
        }
    }
    static async updateStatus(req, res, next) {
        try {
            const status = req.body.status;
            if (!Object.values(index_1.LeaveStatus).includes(status)) {
                res.status(400).json({ success: false, message: 'Invalid leave status.' });
                return;
            }
            const leave = await Leave_1.Leave.findOneAndUpdate({ companyId: req.user.companyId, _id: req.params.id }, { status, approvedBy: req.user.id }, { new: true });
            responseHandler_1.ApiResponse.success(res, 'Leave status updated successfully', leave);
        }
        catch (error) {
            next(error);
        }
    }
}
exports.LeaveController = LeaveController;
