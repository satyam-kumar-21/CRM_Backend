import { Response, NextFunction } from 'express';
import { AuthenticatedRequest } from './authMiddleware';
import { Roles } from '../constants/index';

export const authorizeRoles = (...allowedRoles: Roles[]) => {
  return (req: AuthenticatedRequest, res: Response, next: NextFunction): void => {
    if (!req.user) {
      res.status(401).json({ success: false, message: 'User context is unauthenticated.' });
      return;
    }

    if (!allowedRoles.includes(req.user.role as Roles)) {
      res.status(403).json({
        success: false,
        message: `Forbidden: Role '${req.user.role}' lacks permissions for this operation.`,
      });
      return;
    }

    next();
  };
};