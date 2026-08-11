import { Request, Response, NextFunction } from 'express';
import { AuthenticatedRequest } from './authMiddleware';
import { Company } from '../models/Company';

export const enforceEmployeeLoginEnabled = async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    const user = req.user as any;
    if (!user || !user.companyId) return next();
    // Admins must not be blocked
    if (user.portalType === 'COMPANY_ADMIN') return next();
    const company = await Company.findById(user.companyId).select('settings');
    if (company && company.settings && company.settings.employeeLoginEnabled === false) {
      return res.status(403).json({ success: false, message: 'Employee access is currently disabled by Admin.' });
    }
    next();
  } catch (err) {
    next(err);
  }
};
