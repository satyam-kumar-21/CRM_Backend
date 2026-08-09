import { Response, NextFunction } from 'express';
import { validationResult } from 'express-validator';
import { AuthenticatedRequest } from '../middlewares/authMiddleware';
import { ApiResponse } from '../utils/responseHandler';
import { CompanySalesService } from '../services/companySalesService';

function validate(req: AuthenticatedRequest, res: Response) {
  const errors = validationResult(req);
  if (errors.isEmpty()) return true;
  res.status(400).json({ success: false, errors: errors.array() });
  return false;
}

export class CompanySalesController {
  static async getLeads(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try { ApiResponse.success(res, 'Leads fetched successfully', await CompanySalesService.getLeads(req.user!.companyId!, req.user!.role === 'COMPANY_ADMIN' ? undefined : req.user!.id)); } catch (error) { next(error); }
  }

  static async createLead(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      if (!validate(req, res)) return;
      ApiResponse.success(res, 'Lead created successfully', await CompanySalesService.createLead(req.user!.companyId!, req.body), 201);
    } catch (error) { next(error); }
  }

  static async updateLead(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      if (!validate(req, res)) return;
      ApiResponse.success(res, 'Lead updated successfully', await CompanySalesService.updateLead(req.user!.companyId!, req.params.id, req.body));
    } catch (error) { next(error); }
  }

  static async deleteLead(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try { ApiResponse.success(res, 'Lead deleted successfully', await CompanySalesService.deleteLead(req.user!.companyId!, req.params.id)); } catch (error) { next(error); }
  }

  static async getSales(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try { ApiResponse.success(res, 'Sales fetched successfully', await CompanySalesService.getSales(req.user!.companyId!, req.user!.role === 'COMPANY_ADMIN' ? undefined : req.user!.id)); } catch (error) { next(error); }
  }

  static async createSale(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      if (!validate(req, res)) return;
      ApiResponse.success(res, 'Sale created successfully', await CompanySalesService.createSale(req.user!.companyId!, req.body), 201);
    } catch (error) { next(error); }
  }

  static async updateSale(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      if (!validate(req, res)) return;
      ApiResponse.success(res, 'Sale updated successfully', await CompanySalesService.updateSale(req.user!.companyId!, req.params.id, req.body));
    } catch (error) { next(error); }
  }

  static async deleteSale(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try { ApiResponse.success(res, 'Sale deleted successfully', await CompanySalesService.deleteSale(req.user!.companyId!, req.params.id)); } catch (error) { next(error); }
  }
}
