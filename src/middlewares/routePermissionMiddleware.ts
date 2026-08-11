import { Request, Response, NextFunction } from 'express';
import { AuthenticatedRequest } from './authMiddleware';
import { Company } from '../models/Company';

export const routePermission = (key: string) => {
  return async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    try {
      const user = req.user as any;
      if (!user || !user.companyId) return next();
      if (user.portalType === 'COMPANY_ADMIN') return next();
      const company = await Company.findById(user.companyId).select('settings');
      if (!company) return res.status(403).json({ success: false, message: 'Access denied.' });
      const perms = (company.settings && company.settings.routePermissions) || {};
      if (perms instanceof Map) {
        // Mongoose Map
        const val = perms.get(key);
        if (val === false) return res.status(403).json({ success: false, message: 'Access restricted by Admin.' });
      } else {
        if (perms[key] === false) return res.status(403).json({ success: false, message: 'Access restricted by Admin.' });
      }
      next();
    } catch (err) {
      next(err);
    }
  };
};
