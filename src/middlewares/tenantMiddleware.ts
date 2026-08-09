import { Response, NextFunction } from 'express';
import { AuthenticatedRequest } from './authMiddleware';
import { Company } from '../models/Company';
import { CompanyStatus } from '../constants/index';

export const enforceTenant = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const companyId = req.user?.companyId;

    if (!companyId) {
      res.status(401).json({ success: false, message: 'Tenant identifier missing from request context.' });
      return;
    }

    const company = await Company.findById(companyId).select('status name');

    if (!company) {
      res.status(404).json({ success: false, message: 'Company tenant record not found.' });
      return;
    }

    if (company.status === CompanyStatus.SUSPENDED || company.status === CompanyStatus.BLOCKED) {
      res.status(403).json({ success: false, message: 'This company has been suspended.' });
      return;
    }

    next();
  } catch (error) {
    next(error);
  }
};