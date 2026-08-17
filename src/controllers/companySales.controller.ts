import { Response, NextFunction } from 'express';
import { validationResult } from 'express-validator';
import { AuthenticatedRequest } from '../middlewares/authMiddleware';
import { ApiResponse } from '../utils/responseHandler';
import { CompanySalesService } from '../services/companySalesService';
import { Employee } from '../models/Employee';

function validate(req: AuthenticatedRequest, res: Response) {
  const errors = validationResult(req);
  if (errors.isEmpty()) return true;
  res.status(400).json({ success: false, errors: errors.array() });
  return false;
}

export class CompanySalesController {
  static async getLeads(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      ApiResponse.success(
        res,
        'Leads fetched successfully',
        await CompanySalesService.getLeads(req.user!.companyId!, req.user!.role, req.user!.id)
      );
    } catch (error) {
      next(error);
    }
  }

  static async createLead(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      if (!validate(req, res)) return;
      ApiResponse.success(res, 'Lead created successfully', await CompanySalesService.createLead(req.user!.companyId!, req.body), 201);
    } catch (error) {
      next(error);
    }
  }

  static async acceptLead(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const emp = await Employee.findOne({ companyId: req.user!.companyId, _id: req.user!.id }).select('name');
      const empName = emp?.name || 'Sales Employee';
      ApiResponse.success(
        res,
        'Lead accepted successfully',
        await CompanySalesService.acceptLead(req.user!.companyId!, req.params.id, req.user!.id, empName)
      );
    } catch (error) {
      next(error);
    }
  }

  static async updateLead(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      if (!validate(req, res)) return;
      ApiResponse.success(
        res,
        'Lead updated successfully',
        await CompanySalesService.updateLead(req.user!.companyId!, req.params.id, req.body, req.user!.role, req.user!.id)
      );
    } catch (error) {
      next(error);
    }
  }

  static async deleteLead(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      ApiResponse.success(res, 'Lead deleted successfully', await CompanySalesService.deleteLead(req.user!.companyId!, req.params.id));
    } catch (error) {
      next(error);
    }
  }

  static async getSales(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const failed = req.query.failed === 'true';
      const pending = req.query.pending === 'true';
      res.set('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
      ApiResponse.success(
        res,
        'Sales fetched successfully',
        await CompanySalesService.getSales(req.user!.companyId!, req.user!.role, req.user!.id, failed, pending)
      );
    } catch (error) {
      next(error);
    }
  }

  static async createSale(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      if (!validate(req, res)) return;
      const emp = await Employee.findOne({ companyId: req.user!.companyId, _id: req.user!.id }).select('name');
      const empName = emp?.name || 'Sales Employee';
      ApiResponse.success(
        res,
        'Sale created successfully',
        await CompanySalesService.createSale(req.user!.companyId!, req.body, req.user!.id, empName),
        201
      );
    } catch (error) {
      next(error);
    }
  }

  static async updateSale(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      if (!validate(req, res)) return;
      ApiResponse.success(res, 'Sale updated successfully', await CompanySalesService.updateSale(req.user!.companyId!, req.params.id, req.body));
    } catch (error) {
      next(error);
    }
  }

  static async markSaleFailed(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      if (!validate(req, res)) return;
      const admin = await Employee.findOne({ companyId: req.user!.companyId, _id: req.user!.id }).select('name');
      const failedByName = admin?.name || 'Admin';
      const saleStatus = (req.body.saleStatus as 'PENDING' | 'CHARGED' | 'DROPPED') || 'DROPPED';
      ApiResponse.success(
        res,
        'Sale status updated successfully',
        await CompanySalesService.markSaleFailed(req.user!.companyId!, req.params.id, req.body.failedReason || '', req.user!.id, failedByName, saleStatus),
        200
      );
    } catch (error) {
      next(error);
    }
  }

  static async deleteSale(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      ApiResponse.success(res, 'Sale deleted successfully', await CompanySalesService.deleteSale(req.user!.companyId!, req.params.id));
    } catch (error) {
      next(error);
    }
  }

  // Verification
  static async getVerifications(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const status = req.query.status as string | undefined;
      ApiResponse.success(
        res,
        'Verifications fetched successfully',
        await CompanySalesService.getVerifications(req.user!.companyId!, req.user!.role, req.user!.id, { status })
      );
    } catch (error) {
      next(error);
    }
  }

  static async createVerification(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      if (!validate(req, res)) return;
      const emp = await Employee.findOne({ companyId: req.user!.companyId, _id: req.user!.id }).select('name');
      const empName = emp?.name || 'Admin';
      ApiResponse.success(
        res,
        'Verification created successfully',
        await CompanySalesService.createVerification(req.user!.companyId!, req.body, req.user!.id),
        201
      );
    } catch (error) {
      next(error);
    }
  }

  static async updateVerification(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      if (!validate(req, res)) return;
      ApiResponse.success(
        res,
        'Verification updated successfully',
        await CompanySalesService.updateVerification(req.user!.companyId!, req.params.id, req.body)
      );
    } catch (error) {
      next(error);
    }
  }

  static async deleteVerification(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      ApiResponse.success(
        res,
        'Verification deleted successfully',
        await CompanySalesService.deleteVerification(req.user!.companyId!, req.params.id)
      );
    } catch (error) {
      next(error);
    }
  }

  static async startVerification(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const emp = await Employee.findOne({ companyId: req.user!.companyId, _id: req.user!.id }).select('name');
      const empName = emp?.name || 'Verification Employee';
      ApiResponse.success(
        res,
        'Verification started successfully',
        await CompanySalesService.startVerification(req.user!.companyId!, req.params.id, req.user!.id, empName)
      );
    } catch (error) {
      next(error);
    }
  }

  static async completeVerification(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const emp = await Employee.findOne({ companyId: req.user!.companyId, _id: req.user!.id }).select('name');
      const empName = emp?.name || 'Verification Employee';
      ApiResponse.success(
        res,
        'Verification completed successfully',
        await CompanySalesService.completeVerification(req.user!.companyId!, req.params.id, req.user!.id, empName, req.body)
      );
    } catch (error) {
      next(error);
    }
  }

  // Feedback
  static async getFeedbacks(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const status = req.query.status as string | undefined;
      ApiResponse.success(
        res,
        'Feedbacks fetched successfully',
        await CompanySalesService.getFeedbacks(req.user!.companyId!, req.user!.role, req.user!.id, { status })
      );
    } catch (error) {
      next(error);
    }
  }

  static async completeFeedback(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const emp = await Employee.findOne({ companyId: req.user!.companyId, _id: req.user!.id }).select('name');
      const empName = emp?.name || 'Feedback Employee';
      ApiResponse.success(
        res,
        'Feedback completed successfully',
        await CompanySalesService.completeFeedback(req.user!.companyId!, req.params.id, req.user!.id, empName, req.body)
      );
    } catch (error) {
      next(error);
    }
  }

  // Today's Work
  static async searchCustomers(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      ApiResponse.success(
        res,
        'Customer search results fetched successfully',
        await CompanySalesService.searchCustomers(req.user!.companyId!, req.user!.role, req.user!.id, String(req.query.q || ''))
      );
    } catch (error) {
      next(error);
    }
  }

  static async createUpgrade(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      if (!validate(req, res)) return;
      const emp = await Employee.findOne({ companyId: req.user!.companyId, _id: req.user!.id }).select('name');
      const empName = emp?.name || 'Sales Employee';
      ApiResponse.success(
        res,
        'Upgrade created successfully',
        await CompanySalesService.createUpgrade(req.user!.companyId!, req.body, req.user!.id, empName),
        201
      );
    } catch (error) {
      next(error);
    }
  }

  static async getUpgrades(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      ApiResponse.success(
        res,
        'Upgrades fetched successfully',
        await CompanySalesService.getUpgrades(req.user!.companyId!, req.user!.role, req.user!.id, {
          customerId: String(req.query.customerId || ''),
          status: String(req.query.status || ''),
          q: String(req.query.q || ''),
        })
      );
    } catch (error) {
      next(error);
    }
  }

  static async getTodaysWork(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const emp = await Employee.findOne({ companyId: req.user!.companyId, _id: req.user!.id }).select('name');
      const empName = emp?.name || 'Employee';
      ApiResponse.success(
        res,
        "Today's Work fetched successfully",
        await CompanySalesService.getTodaysWork(req.user!.companyId!, req.user!.role, req.user!.id, empName)
      );
    } catch (error) {
      next(error);
    }
  }
}
