import { Request, Response, NextFunction } from 'express';
import { validationResult } from 'express-validator';
import { RemoteSupportService } from '../services/remoteSupportService';
import { ApiResponse } from '../utils/responseHandler';
import { AuthenticatedRequest } from '../middlewares/authMiddleware';

export class RemoteSupportController {
  static async list(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const filterKeys = ['status', 'customerName', 'salesEmployeeName', 'techSupportEmployeeName', 'fromDate', 'toDate', 'failedReason'];
      const filters: Record<string, any> = {};
      for (const key of filterKeys) {
        if (req.query[key]) filters[key] = String(req.query[key]);
      }
      const records = await RemoteSupportService.list(req.user!.companyId!, req.user!.role, req.user!.id, filters);
      ApiResponse.success(res, 'Remote support records fetched successfully', records);
    } catch (error) {
      next(error);
    }
  }

  static async create(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        res.status(400).json({ success: false, errors: errors.array() });
        return;
      }

      const record = await RemoteSupportService.create(req.user!.companyId!, {
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
      ApiResponse.success(res, 'Remote support request created successfully', record, 201);
    } catch (error) {
      next(error);
    }
  }

  static async update(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        res.status(400).json({ success: false, errors: errors.array() });
        return;
      }
      const updated = await RemoteSupportService.update(req.user!.companyId!, req.user!.role, req.user!.id, req.params.id, {
        status: req.body.status,
        techSupportEmployeeId: req.body.techSupportEmployeeId,
        failedReason: req.body.failedReason,
      });
      ApiResponse.success(res, 'Remote support record updated successfully', updated);
    } catch (error) {
      next(error);
    }
  }

  static async delete(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      await RemoteSupportService.delete(req.user!.companyId!, req.user!.role, req.user!.id, req.params.id);
      ApiResponse.success(res, 'Remote support record deleted successfully', null);
    } catch (error) {
      next(error);
    }
  }
}
