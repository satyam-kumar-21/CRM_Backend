import { Response, NextFunction } from 'express';
import { AuthenticatedRequest } from '../middlewares/authMiddleware';
import { ApiResponse } from '../utils/responseHandler';
import { AttendanceService } from '../services/attendanceService';
import { Roles } from '../constants/index';

export class AttendanceController {
  static async list(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const isAdmin = req.user!.role === Roles.COMPANY_ADMIN;
      const records = await AttendanceService.list(req.user!.companyId!, isAdmin ? undefined : req.user!.id, {
        employeeId: isAdmin ? req.query.employeeId as string | undefined : undefined,
        from: req.query.from as string | undefined,
        to: req.query.to as string | undefined,
      });
      ApiResponse.success(res, 'Attendance fetched successfully', records);
    } catch (error) { next(error); }
  }

  static async employees(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try { ApiResponse.success(res, 'Attendance employees fetched successfully', await AttendanceService.employees(req.user!.companyId!)); } catch (error) { next(error); }
  }
}
