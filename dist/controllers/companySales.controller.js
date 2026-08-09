"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.CompanySalesController = void 0;
const express_validator_1 = require("express-validator");
const responseHandler_1 = require("../utils/responseHandler");
const companySalesService_1 = require("../services/companySalesService");
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
            responseHandler_1.ApiResponse.success(res, 'Leads fetched successfully', await companySalesService_1.CompanySalesService.getLeads(req.user.companyId));
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
            responseHandler_1.ApiResponse.success(res, 'Sales fetched successfully', await companySalesService_1.CompanySalesService.getSales(req.user.companyId));
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
