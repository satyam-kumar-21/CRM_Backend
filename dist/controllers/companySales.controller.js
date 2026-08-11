"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.CompanySalesController = void 0;
const express_validator_1 = require("express-validator");
const responseHandler_1 = require("../utils/responseHandler");
const companySalesService_1 = require("../services/companySalesService");
const Employee_1 = require("../models/Employee");
function validate(req, res) {
    const errors = (0, express_validator_1.validationResult)(req);
    if (errors.isEmpty())
        return true;
    res.status(400).json({ success: false, errors: errors.array() });
    return false;
}
class CompanySalesController {
    static async getLeads(req, res, next) {
        try {
            responseHandler_1.ApiResponse.success(res, 'Leads fetched successfully', await companySalesService_1.CompanySalesService.getLeads(req.user.companyId, req.user.role === 'COMPANY_ADMIN' ? undefined : req.user.id));
        }
        catch (error) {
            next(error);
        }
    }
    static async createLead(req, res, next) {
        try {
            if (!validate(req, res))
                return;
            responseHandler_1.ApiResponse.success(res, 'Lead created successfully', await companySalesService_1.CompanySalesService.createLead(req.user.companyId, req.body), 201);
        }
        catch (error) {
            next(error);
        }
    }
    static async updateLead(req, res, next) {
        try {
            if (!validate(req, res))
                return;
            responseHandler_1.ApiResponse.success(res, 'Lead updated successfully', await companySalesService_1.CompanySalesService.updateLead(req.user.companyId, req.params.id, req.body));
        }
        catch (error) {
            next(error);
        }
    }
    static async deleteLead(req, res, next) {
        try {
            responseHandler_1.ApiResponse.success(res, 'Lead deleted successfully', await companySalesService_1.CompanySalesService.deleteLead(req.user.companyId, req.params.id));
        }
        catch (error) {
            next(error);
        }
    }
    static async getSales(req, res, next) {
        try {
            const failed = req.query.failed === 'true';
            res.set('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
            responseHandler_1.ApiResponse.success(res, 'Sales fetched successfully', await companySalesService_1.CompanySalesService.getSales(req.user.companyId, req.user.role === 'COMPANY_ADMIN' ? undefined : req.user.id, failed));
        }
        catch (error) {
            next(error);
        }
    }
    static async createSale(req, res, next) {
        try {
            if (!validate(req, res))
                return;
            responseHandler_1.ApiResponse.success(res, 'Sale created successfully', await companySalesService_1.CompanySalesService.createSale(req.user.companyId, req.body), 201);
        }
        catch (error) {
            next(error);
        }
    }
    static async updateSale(req, res, next) {
        try {
            if (!validate(req, res))
                return;
            responseHandler_1.ApiResponse.success(res, 'Sale updated successfully', await companySalesService_1.CompanySalesService.updateSale(req.user.companyId, req.params.id, req.body));
        }
        catch (error) {
            next(error);
        }
    }
    static async markSaleFailed(req, res, next) {
        try {
            if (!validate(req, res))
                return;
            const admin = await Employee_1.Employee.findOne({ companyId: req.user.companyId, _id: req.user.id }).select('name');
            const failedByName = admin?.name || 'Admin';
            responseHandler_1.ApiResponse.success(res, 'Sale marked as failed successfully', await companySalesService_1.CompanySalesService.markSaleFailed(req.user.companyId, req.params.id, req.body.failedReason, req.user.id, failedByName), 200);
        }
        catch (error) {
            next(error);
        }
    }
    static async deleteSale(req, res, next) {
        try {
            responseHandler_1.ApiResponse.success(res, 'Sale deleted successfully', await companySalesService_1.CompanySalesService.deleteSale(req.user.companyId, req.params.id));
        }
        catch (error) {
            next(error);
        }
    }
}
exports.CompanySalesController = CompanySalesController;
