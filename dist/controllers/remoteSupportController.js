"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.RemoteSupportController = void 0;
const express_validator_1 = require("express-validator");
const remoteSupportService_1 = require("../services/remoteSupportService");
const responseHandler_1 = require("../utils/responseHandler");
class RemoteSupportController {
    static async list(req, res, next) {
        try {
            const filterKeys = ['status', 'customerName', 'salesEmployeeName', 'techSupportEmployeeName', 'fromDate', 'toDate', 'failedReason'];
            const filters = {};
            for (const key of filterKeys) {
                if (req.query[key])
                    filters[key] = String(req.query[key]);
            }
            const records = await remoteSupportService_1.RemoteSupportService.list(req.user.companyId, req.user.role, req.user.id, filters);
            responseHandler_1.ApiResponse.success(res, 'Remote support records fetched successfully', records);
        }
        catch (error) {
            next(error);
        }
    }
    static async create(req, res, next) {
        try {
            const errors = (0, express_validator_1.validationResult)(req);
            if (!errors.isEmpty()) {
                res.status(400).json({ success: false, errors: errors.array() });
                return;
            }
            const record = await remoteSupportService_1.RemoteSupportService.create(req.user.companyId, {
                leadId: req.body.leadId,
                customerName: req.body.customerName,
                customerContact: req.body.customerContact,
                salesEmployeeId: req.body.salesEmployeeId,
                salesEmployeeName: req.body.salesEmployeeName,
                techSupportEmployeeId: req.body.techSupportEmployeeId,
                techSupportEmployeeName: req.body.techSupportEmployeeName,
                dateTime: new Date(req.body.dateTime),
                issueReason: req.body.issueReason,
            });
            responseHandler_1.ApiResponse.success(res, 'Remote support request created successfully', record, 201);
        }
        catch (error) {
            next(error);
        }
    }
    static async update(req, res, next) {
        try {
            const errors = (0, express_validator_1.validationResult)(req);
            if (!errors.isEmpty()) {
                res.status(400).json({ success: false, errors: errors.array() });
                return;
            }
            const updated = await remoteSupportService_1.RemoteSupportService.update(req.user.companyId, req.user.role, req.user.id, req.params.id, {
                status: req.body.status,
                techSupportEmployeeId: req.body.techSupportEmployeeId,
                failedReason: req.body.failedReason,
            });
            responseHandler_1.ApiResponse.success(res, 'Remote support record updated successfully', updated);
        }
        catch (error) {
            next(error);
        }
    }
    static async delete(req, res, next) {
        try {
            await remoteSupportService_1.RemoteSupportService.delete(req.user.companyId, req.user.role, req.user.id, req.params.id);
            responseHandler_1.ApiResponse.success(res, 'Remote support record deleted successfully', null);
        }
        catch (error) {
            next(error);
        }
    }
}
exports.RemoteSupportController = RemoteSupportController;
