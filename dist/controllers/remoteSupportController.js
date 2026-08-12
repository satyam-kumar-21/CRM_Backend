"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.RemoteSupportController = void 0;
const express_validator_1 = require("express-validator");
const remoteSupportService_1 = require("../services/remoteSupportService");
const responseHandler_1 = require("../utils/responseHandler");
const socket_1 = require("../realtime/socket");
class RemoteSupportController {
    static async list(req, res, next) {
        try {
            const filterKeys = ['status', 'customerName', 'salesEmployeeName', 'techSupportEmployeeName', 'fromDate', 'toDate', 'failedReason', 'leadId'];
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
                workflowMessageId: req.body.workflowMessageId,
                customerName: req.body.customerName,
                customerContact: req.body.customerContact,
                country: req.body.country,
                system: req.body.system,
                otherDetails: req.body.otherDetails,
                salesEmployeeId: req.body.salesEmployeeId || req.user.id,
                salesEmployeeName: req.body.salesEmployeeName || 'Sales Rep',
                techSupportEmployeeId: req.body.techSupportEmployeeId,
                techSupportEmployeeName: req.body.techSupportEmployeeName,
                dateTime: req.body.dateTime ? new Date(req.body.dateTime) : new Date(),
                issueReason: req.body.issueReason || 'Remote support requested',
            });
            (0, socket_1.emitCompanyEvent)('support:created', record);
            responseHandler_1.ApiResponse.success(res, 'Remote support request created successfully', record, 201);
        }
        catch (error) {
            next(error);
        }
    }
    static async accept(req, res, next) {
        try {
            const record = await remoteSupportService_1.RemoteSupportService.accept(req.user.companyId, req.user.id, req.params.id);
            (0, socket_1.emitCompanyEvent)('support:accepted', record);
            (0, socket_1.emitUserEvent)([record.salesEmployeeId.toString()], 'support:updated', record);
            responseHandler_1.ApiResponse.success(res, 'Remote support request accepted successfully', record);
        }
        catch (error) {
            next(error);
        }
    }
    static async reject(req, res, next) {
        try {
            const { rejectedReason } = req.body;
            const record = await remoteSupportService_1.RemoteSupportService.reject(req.user.companyId, req.user.id, req.params.id, rejectedReason);
            (0, socket_1.emitCompanyEvent)('support:rejected', record);
            (0, socket_1.emitUserEvent)([record.salesEmployeeId.toString()], 'support:updated', record);
            responseHandler_1.ApiResponse.success(res, 'Remote support request rejected successfully', record);
        }
        catch (error) {
            next(error);
        }
    }
    static async complete(req, res, next) {
        try {
            const { status, failedReason } = req.body;
            const record = await remoteSupportService_1.RemoteSupportService.complete(req.user.companyId, req.user.id, req.params.id, { status, failedReason });
            (0, socket_1.emitCompanyEvent)('support:completed', record);
            (0, socket_1.emitUserEvent)([record.salesEmployeeId.toString()], 'support:updated', record);
            responseHandler_1.ApiResponse.success(res, 'Remote support status updated successfully', record);
        }
        catch (error) {
            next(error);
        }
    }
    static async assign(req, res, next) {
        try {
            const { techSupportEmployeeId } = req.body;
            const record = await remoteSupportService_1.RemoteSupportService.assign(req.user.companyId, req.params.id, techSupportEmployeeId);
            (0, socket_1.emitCompanyEvent)('support:assigned', record);
            (0, socket_1.emitUserEvent)([techSupportEmployeeId, record.salesEmployeeId.toString()], 'support:updated', record);
            responseHandler_1.ApiResponse.success(res, 'Remote support assigned successfully', record);
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
                rejectedReason: req.body.rejectedReason,
            });
            (0, socket_1.emitCompanyEvent)('support:updated', updated);
            (0, socket_1.emitUserEvent)([updated.salesEmployeeId.toString(), updated.techSupportEmployeeId?.toString()].filter(Boolean), 'support:updated', updated);
            responseHandler_1.ApiResponse.success(res, 'Remote support record updated successfully', updated);
        }
        catch (error) {
            next(error);
        }
    }
    static async delete(req, res, next) {
        try {
            await remoteSupportService_1.RemoteSupportService.delete(req.user.companyId, req.user.role, req.user.id, req.params.id);
            (0, socket_1.emitCompanyEvent)('support:updated', { id: req.params.id, deleted: true });
            responseHandler_1.ApiResponse.success(res, 'Remote support record deleted successfully', null);
        }
        catch (error) {
            next(error);
        }
    }
}
exports.RemoteSupportController = RemoteSupportController;
