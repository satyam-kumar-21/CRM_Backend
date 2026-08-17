import { Request, Response, NextFunction } from 'express';
import { Company } from '../models/Company';
import { ApiResponse } from '../utils/responseHandler';
import { AuthenticatedRequest } from '../middlewares/authMiddleware';
import { emitUserEvent, disconnectUser } from '../realtime/socket';
import { Employee } from '../models/Employee';
import { Roles, CompanyStatus } from '../constants/index';

export class CompanySettingsController {
  static async getLoginConfig(_req: Request, res: Response, next: NextFunction) {
    try {
      const company = await Company.findOne({ status: CompanyStatus.ACTIVE }).select('settings name');
      if (!company) return ApiResponse.error(res, 'Company not configured', 404);
      ApiResponse.success(res, 'Login config fetched', {
        companyName: company.settings?.companyName || company.name,
        employeeLoginEnabled: company.settings?.employeeLoginEnabled !== false,
        employeeOtpEnabled: company.settings?.employeeOtpEnabled === true,
      });
    } catch (error) {
      next(error);
    }
  }

  static async getSettings(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const company = await Company.findById(req.user!.companyId).select('settings name');
      if (!company) return ApiResponse.error(res, 'Company not found', 404);
      ApiResponse.success(res, 'Company settings fetched', { settings: company.settings || {}, name: company.name });
    } catch (error) {
      next(error);
    }
  }

  static async updateSettings(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const payload = req.body || {};
      const company = await Company.findById(req.user!.companyId);
      if (!company) return ApiResponse.error(res, 'Company not found', 404);

      // Merge allowed fields
      const settings: any = company.settings = company.settings || {} as any;

      if (typeof payload.companyName === 'string') settings.companyName = payload.companyName;
      if (typeof payload.employeeLoginEnabled === 'boolean') settings.employeeLoginEnabled = payload.employeeLoginEnabled;
      if (typeof payload.employeeOtpEnabled === 'boolean') settings.employeeOtpEnabled = payload.employeeOtpEnabled;
      if (typeof payload.routePermissions === 'object') settings.routePermissions = payload.routePermissions;
      if (Array.isArray(payload.holidays)) settings.holidays = payload.holidays.map((h: any) => ({ name: h.name, date: h.date }));

      // Also keep top-level company name in sync if provided
      if (typeof payload.companyName === 'string' && payload.companyName.trim()) company.name = payload.companyName.trim();

      // determine what changed to emit targeted events
      const saved = await company.save();

      const employees = await Employee.find({ companyId: req.user!.companyId, isSuspended: false }).select('_id');
      const userIds = employees.map((e) => e._id.toString());

      // Emit company name update
      if (typeof payload.companyName === 'string') {
        emitUserEvent(userIds, 'companyNameUpdated', { companyName: saved.settings?.companyName || saved.name });
      }

      // Emit employee login disabled/enabled only to non-admin employees
      if (typeof payload.employeeLoginEnabled === 'boolean') {
        const nonAdminEmployeeIds = (await Employee.find({ companyId: req.user!.companyId, isSuspended: false, role: { $ne: Roles.COMPANY_ADMIN } }).select('_id')).map((e) => e._id.toString());

        if (payload.employeeLoginEnabled === false) {
          // Invalidate refresh tokens for all non-admin employees
          await Employee.updateMany({ companyId: req.user!.companyId, role: { $ne: Roles.COMPANY_ADMIN } }, { $set: { refreshTokens: [] } });
          emitUserEvent(nonAdminEmployeeIds, 'employeeLoginDisabled', { message: 'Employee login disabled by Admin.' });
          // Force-disconnect live sockets for each non-admin employee
          for (const uid of nonAdminEmployeeIds) {
            try { await disconnectUser(uid); } catch { }
          }
        } else {
          emitUserEvent(nonAdminEmployeeIds, 'employeeLoginEnabled', { message: 'Employee login enabled by Admin.' });
        }
      }

      // Emit permissions update
      if (typeof payload.routePermissions === 'object') {
        emitUserEvent(userIds, 'permissionsUpdated', { routePermissions: saved.settings?.routePermissions || {} });
      }

      // Emit holidays update
      if (Array.isArray(payload.holidays)) {
        emitUserEvent(userIds, 'holidaysUpdated', { holidays: saved.settings?.holidays || [] });
      }

      ApiResponse.success(res, 'Company settings updated', { settings: settings });
    } catch (error) {
      next(error);
    }
  }

  static async listHolidays(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const company = await Company.findById(req.user!.companyId).select('settings');
      if (!company) return ApiResponse.error(res, 'Company not found', 404);
      ApiResponse.success(res, 'Holidays fetched', { holidays: company.settings?.holidays || [] });
    } catch (error) {
      next(error);
    }
  }

  static async addHoliday(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const { name, date } = req.body;
      if (!name || !date) return ApiResponse.error(res, 'Name and date are required', 400);
      const company = await Company.findById(req.user!.companyId);
      if (!company) return ApiResponse.error(res, 'Company not found', 404);
      const settings: any = company.settings = company.settings || {} as any;
      settings.holidays = settings.holidays || [];
      settings.holidays.push({ name: String(name).trim(), date: new Date(date) } as any);
      await company.save();
      emitUserEvent((await Employee.find({ companyId: req.user!.companyId, isSuspended: false }).select('_id')).map((e) => (e._id as any).toString()), 'holidaysUpdated', { holidays: settings.holidays });
      ApiResponse.success(res, 'Holiday added', { holidays: settings.holidays }, 201);
    } catch (error) {
      next(error);
    }
  }

  static async updateHoliday(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const { name, date } = req.body;
      const hid = req.params.hid;
      const company = await Company.findById(req.user!.companyId);
      if (!company) return ApiResponse.error(res, 'Company not found', 404);
      const settings: any = company.settings = company.settings || {} as any;
      const holidays = settings.holidays || [];
      const sub = (holidays as any).id ? (holidays as any).id(hid) : holidays.find((h: any) => String(h._id) === hid);
      if (!sub) return ApiResponse.error(res, 'Holiday not found', 404);
      if (name) sub.name = String(name).trim();
      if (date) sub.date = new Date(date);
      await company.save();
      emitUserEvent((await Employee.find({ companyId: req.user!.companyId, isSuspended: false }).select('_id')).map((e) => (e._id as any).toString()), 'holidaysUpdated', { holidays: settings.holidays });
      ApiResponse.success(res, 'Holiday updated', { holidays: settings.holidays });
    } catch (error) {
      next(error);
    }
  }

  static async deleteHoliday(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const hid = req.params.hid;
      const company = await Company.findById(req.user!.companyId);
      if (!company) return ApiResponse.error(res, 'Company not found', 404);
      const settings: any = company.settings = company.settings || {} as any;
      const before = (settings.holidays || []).length;
      settings.holidays = (settings.holidays || []).filter((h: any) => String(h._id) !== hid);
      if ((settings.holidays || []).length === before) return ApiResponse.error(res, 'Holiday not found', 404);
      await company.save();
      emitUserEvent((await Employee.find({ companyId: req.user!.companyId, isSuspended: false }).select('_id')).map((e) => (e._id as any).toString()), 'holidaysUpdated', { holidays: settings.holidays });
      ApiResponse.success(res, 'Holiday deleted', { holidays: settings.holidays });
    } catch (error) {
      next(error);
    }
  }
}
