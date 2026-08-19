"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.CompanySettingsController = void 0;
const Company_1 = require("../models/Company");
const responseHandler_1 = require("../utils/responseHandler");
const socket_1 = require("../realtime/socket");
const Employee_1 = require("../models/Employee");
const index_1 = require("../constants/index");
class CompanySettingsController {
    static async getLoginConfig(_req, res, next) {
        try {
            const company = await Company_1.Company.findOne({ status: index_1.CompanyStatus.ACTIVE }).select('settings name');
            if (!company)
                return responseHandler_1.ApiResponse.error(res, 'Company not configured', 404);
            responseHandler_1.ApiResponse.success(res, 'Login config fetched', {
                companyName: company.settings?.companyName || company.name,
                employeeLoginEnabled: company.settings?.employeeLoginEnabled !== false,
                employeeOtpEnabled: company.settings?.employeeOtpEnabled === true,
            });
        }
        catch (error) {
            next(error);
        }
    }
    static async getSettings(req, res, next) {
        try {
            const company = await Company_1.Company.findById(req.user.companyId).select('settings name');
            if (!company)
                return responseHandler_1.ApiResponse.error(res, 'Company not found', 404);
            responseHandler_1.ApiResponse.success(res, 'Company settings fetched', { settings: company.settings || {}, name: company.name });
        }
        catch (error) {
            next(error);
        }
    }
    static async updateSettings(req, res, next) {
        try {
            const payload = req.body || {};
            const company = await Company_1.Company.findById(req.user.companyId);
            if (!company)
                return responseHandler_1.ApiResponse.error(res, 'Company not found', 404);
            // Merge allowed fields
            const settings = company.settings = company.settings || {};
            if (typeof payload.companyName === 'string')
                settings.companyName = payload.companyName;
            if (typeof payload.employeeLoginEnabled === 'boolean')
                settings.employeeLoginEnabled = payload.employeeLoginEnabled;
            if (typeof payload.employeeOtpEnabled === 'boolean')
                settings.employeeOtpEnabled = payload.employeeOtpEnabled;
            if (typeof payload.routePermissions === 'object')
                settings.routePermissions = payload.routePermissions;
            if (Array.isArray(payload.holidays))
                settings.holidays = payload.holidays.map((h) => ({ name: h.name, date: h.date }));
            // Also keep top-level company name in sync if provided
            if (typeof payload.companyName === 'string' && payload.companyName.trim())
                company.name = payload.companyName.trim();
            // determine what changed to emit targeted events
            const saved = await company.save();
            const employees = await Employee_1.Employee.find({ companyId: req.user.companyId, isSuspended: false }).select('_id');
            const userIds = employees.map((e) => e._id.toString());
            // Emit company name update
            if (typeof payload.companyName === 'string') {
                (0, socket_1.emitUserEvent)(userIds, 'companyNameUpdated', { companyName: saved.settings?.companyName || saved.name });
            }
            // Emit employee login disabled/enabled only to non-admin employees
            if (typeof payload.employeeLoginEnabled === 'boolean') {
                const nonAdminEmployeeIds = (await Employee_1.Employee.find({ companyId: req.user.companyId, isSuspended: false, role: { $ne: index_1.Roles.COMPANY_ADMIN } }).select('_id')).map((e) => e._id.toString());
                if (payload.employeeLoginEnabled === false) {
                    // Invalidate refresh tokens for all non-admin employees
                    await Employee_1.Employee.updateMany({ companyId: req.user.companyId, role: { $ne: index_1.Roles.COMPANY_ADMIN } }, { $set: { refreshTokens: [] } });
                    (0, socket_1.emitUserEvent)(nonAdminEmployeeIds, 'employeeLoginDisabled', { message: 'Employee login disabled by Admin.' });
                    // Force-disconnect live sockets for each non-admin employee
                    for (const uid of nonAdminEmployeeIds) {
                        try {
                            await (0, socket_1.disconnectUser)(uid);
                        }
                        catch { }
                    }
                }
                else {
                    (0, socket_1.emitUserEvent)(nonAdminEmployeeIds, 'employeeLoginEnabled', { message: 'Employee login enabled by Admin.' });
                }
            }
            // Emit permissions update
            if (typeof payload.routePermissions === 'object') {
                (0, socket_1.emitUserEvent)(userIds, 'permissionsUpdated', { routePermissions: saved.settings?.routePermissions || {} });
            }
            // Emit holidays update
            if (Array.isArray(payload.holidays)) {
                (0, socket_1.emitUserEvent)(userIds, 'holidaysUpdated', { holidays: saved.settings?.holidays || [] });
            }
            responseHandler_1.ApiResponse.success(res, 'Company settings updated', { settings: settings });
        }
        catch (error) {
            next(error);
        }
    }
    static async listHolidays(req, res, next) {
        try {
            const company = await Company_1.Company.findById(req.user.companyId).select('settings');
            if (!company)
                return responseHandler_1.ApiResponse.error(res, 'Company not found', 404);
            responseHandler_1.ApiResponse.success(res, 'Holidays fetched', { holidays: company.settings?.holidays || [] });
        }
        catch (error) {
            next(error);
        }
    }
    static async addHoliday(req, res, next) {
        try {
            const { name, date } = req.body;
            if (!name || !date)
                return responseHandler_1.ApiResponse.error(res, 'Name and date are required', 400);
            const company = await Company_1.Company.findById(req.user.companyId);
            if (!company)
                return responseHandler_1.ApiResponse.error(res, 'Company not found', 404);
            const settings = company.settings = company.settings || {};
            settings.holidays = settings.holidays || [];
            settings.holidays.push({ name: String(name).trim(), date: new Date(date) });
            await company.save();
            (0, socket_1.emitUserEvent)((await Employee_1.Employee.find({ companyId: req.user.companyId, isSuspended: false }).select('_id')).map((e) => e._id.toString()), 'holidaysUpdated', { holidays: settings.holidays });
            responseHandler_1.ApiResponse.success(res, 'Holiday added', { holidays: settings.holidays }, 201);
        }
        catch (error) {
            next(error);
        }
    }
    static async updateHoliday(req, res, next) {
        try {
            const { name, date } = req.body;
            const hid = req.params.hid;
            const company = await Company_1.Company.findById(req.user.companyId);
            if (!company)
                return responseHandler_1.ApiResponse.error(res, 'Company not found', 404);
            const settings = company.settings = company.settings || {};
            const holidays = settings.holidays || [];
            const sub = holidays.id ? holidays.id(hid) : holidays.find((h) => String(h._id) === hid);
            if (!sub)
                return responseHandler_1.ApiResponse.error(res, 'Holiday not found', 404);
            if (name)
                sub.name = String(name).trim();
            if (date)
                sub.date = new Date(date);
            await company.save();
            (0, socket_1.emitUserEvent)((await Employee_1.Employee.find({ companyId: req.user.companyId, isSuspended: false }).select('_id')).map((e) => e._id.toString()), 'holidaysUpdated', { holidays: settings.holidays });
            responseHandler_1.ApiResponse.success(res, 'Holiday updated', { holidays: settings.holidays });
        }
        catch (error) {
            next(error);
        }
    }
    static async deleteHoliday(req, res, next) {
        try {
            const hid = req.params.hid;
            const company = await Company_1.Company.findById(req.user.companyId);
            if (!company)
                return responseHandler_1.ApiResponse.error(res, 'Company not found', 404);
            const settings = company.settings = company.settings || {};
            const before = (settings.holidays || []).length;
            settings.holidays = (settings.holidays || []).filter((h) => String(h._id) !== hid);
            if ((settings.holidays || []).length === before)
                return responseHandler_1.ApiResponse.error(res, 'Holiday not found', 404);
            await company.save();
            (0, socket_1.emitUserEvent)((await Employee_1.Employee.find({ companyId: req.user.companyId, isSuspended: false }).select('_id')).map((e) => e._id.toString()), 'holidaysUpdated', { holidays: settings.holidays });
            responseHandler_1.ApiResponse.success(res, 'Holiday deleted', { holidays: settings.holidays });
        }
        catch (error) {
            next(error);
        }
    }
}
exports.CompanySettingsController = CompanySettingsController;
