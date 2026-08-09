import { Response, NextFunction } from 'express';
import { AuthenticatedRequest } from '../middlewares/authMiddleware';
import { ApiResponse } from '../utils/responseHandler';
import { Leave } from '../models/Leave';
import { LeaveStatus, Roles } from '../constants/index';

export class LeaveController {
  static async list(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try { const isAdmin = req.user!.role === Roles.COMPANY_ADMIN; const query: Record<string, unknown> = { companyId: req.user!.companyId }; if (!isAdmin) query.employeeId = req.user!.id; if (req.query.month) { const month = String(req.query.month); query.startDate = { $gte: new Date(`${month}-01`), $lt: new Date(`${month}-31T23:59:59.999Z`) }; } const records = await Leave.find(query).populate('employeeId', 'name employeeId role').sort({ startDate: -1 }); ApiResponse.success(res, 'Leave records fetched successfully', records); } catch (error) { next(error); }
  }
  static async updateStatus(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try { const status = req.body.status as LeaveStatus; if (!Object.values(LeaveStatus).includes(status)) { res.status(400).json({ success: false, message: 'Invalid leave status.' }); return; } const leave = await Leave.findOneAndUpdate({ companyId: req.user!.companyId, _id: req.params.id }, { status, approvedBy: req.user!.id }, { new: true }); ApiResponse.success(res, 'Leave status updated successfully', leave); } catch (error) { next(error); }
  }
}
