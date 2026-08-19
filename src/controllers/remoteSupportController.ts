import { Request, Response, NextFunction } from 'express';
import { validationResult } from 'express-validator';
import { RemoteSupportService } from '../services/remoteSupportService';
import { ApiResponse } from '../utils/responseHandler';
import { AuthenticatedRequest } from '../middlewares/authMiddleware';
import { emitCompanyEvent, emitUserEvent } from '../realtime/socket';

export class RemoteSupportController {
  static async list(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const filterKeys = ['status', 'customerName', 'salesEmployeeName', 'techSupportEmployeeName', 'fromDate', 'toDate', 'today', 'failedReason', 'leadId'];
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
        workflowMessageId: req.body.workflowMessageId,
        customerName: req.body.customerName,
        customerContact: req.body.customerContact,
        country: req.body.country,
        system: req.body.system,
        otherDetails: req.body.otherDetails,
        salesEmployeeId: req.body.salesEmployeeId || req.user!.id,
        salesEmployeeName: req.body.salesEmployeeName || 'Sales Rep',
        techSupportEmployeeId: req.body.techSupportEmployeeId,
        techSupportEmployeeName: req.body.techSupportEmployeeName,
        dateTime: req.body.dateTime ? new Date(req.body.dateTime) : new Date(),
        issueReason: req.body.issueReason || 'Remote support requested',
      });

      emitCompanyEvent('support:created', record);
      ApiResponse.success(res, 'Remote support request created successfully', record, 201);
    } catch (error) {
      next(error);
    }
  }

  static async accept(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const record = await RemoteSupportService.accept(req.user!.companyId!, req.user!.id, req.params.id);
      emitCompanyEvent('support:accepted', record);
      emitUserEvent([record.salesEmployeeId.toString()], 'support:updated', record);
      ApiResponse.success(res, 'Remote support request accepted successfully', record);
    } catch (error) {
      next(error);
    }
  }

  static async reject(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const { rejectedReason } = req.body;
      const record = await RemoteSupportService.reject(req.user!.companyId!, req.user!.id, req.params.id, rejectedReason);
      emitCompanyEvent('support:rejected', record);
      emitUserEvent([record.salesEmployeeId.toString()], 'support:updated', record);
      ApiResponse.success(res, 'Remote support request rejected successfully', record);
    } catch (error) {
      next(error);
    }
  }

  static async complete(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const { status, failedReason } = req.body;
      const record = await RemoteSupportService.complete(req.user!.companyId!, req.user!.id, req.params.id, { status, failedReason });
      emitCompanyEvent('support:completed', record);
      emitUserEvent([record.salesEmployeeId.toString()], 'support:updated', record);
      ApiResponse.success(res, 'Remote support status updated successfully', record);
    } catch (error) {
      next(error);
    }
  }

  static async assign(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const { techSupportEmployeeId } = req.body;
      const record = await RemoteSupportService.assign(req.user!.companyId!, req.params.id, techSupportEmployeeId);
      emitCompanyEvent('support:assigned', record);
      emitUserEvent([techSupportEmployeeId, record.salesEmployeeId.toString()], 'support:updated', record);
      ApiResponse.success(res, 'Remote support assigned successfully', record);
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
        rejectedReason: req.body.rejectedReason,
      });
      emitCompanyEvent('support:updated', updated);
      emitUserEvent([updated.salesEmployeeId.toString(), updated.techSupportEmployeeId?.toString()].filter(Boolean) as string[], 'support:updated', updated);
      ApiResponse.success(res, 'Remote support record updated successfully', updated);
    } catch (error) {
      next(error);
    }
  }

  static async delete(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      await RemoteSupportService.delete(req.user!.companyId!, req.user!.role, req.user!.id, req.params.id);
      emitCompanyEvent('support:updated', { id: req.params.id, deleted: true });
      ApiResponse.success(res, 'Remote support record deleted successfully', null);
    } catch (error) {
      next(error);
    }
  }
}
