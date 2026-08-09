import { Request, Response, NextFunction } from 'express';
import { validationResult } from 'express-validator';
import { CompanyAuthService } from '../services/companyAuthService';
import { ApiResponse } from '../utils/responseHandler';
import { AuthenticatedRequest } from '../middlewares/authMiddleware';

export class CompanyAuthController {
  static async login(req: Request, res: Response, next: NextFunction) {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        res.status(400).json({ success: false, errors: errors.array() });
        return;
      }

      const { employeeId, email, password } = req.body;
      const identifier = email || employeeId;
      const result = await CompanyAuthService.login(identifier, password);

      res.cookie('accessToken', result.accessToken, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'lax',
        maxAge: 15 * 60 * 1000,
      });

      res.cookie('refreshToken', result.refreshToken, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'lax',
        maxAge: 7 * 24 * 60 * 60 * 1000,
      });

      ApiResponse.success(res, 'Company user authenticated successfully', result);
    } catch (error) {
      next(error);
    }
  }

  static async validateSession(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      ApiResponse.success(res, 'Session valid', { user: req.user });
    } catch (error) {
      next(error);
    }
  }

  static async logout(_req: Request, res: Response, next: NextFunction) {
    try {
      res.clearCookie('accessToken');
      res.clearCookie('refreshToken');
      ApiResponse.success(res, 'Logged out successfully', null);
    } catch (error) {
      next(error);
    }
  }

  static async getDashboard(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const dashboard = await CompanyAuthService.getDashboard(req.user!.id, req.user!.companyId!, req.user!.role);
      ApiResponse.success(res, 'Company dashboard fetched successfully', dashboard);
    } catch (error) {
      next(error);
    }
  }

  static async createEmployee(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        res.status(400).json({ success: false, errors: errors.array() });
        return;
      }

      const employee = await CompanyAuthService.createEmployee(req.user!.companyId!, req.body);
      ApiResponse.success(res, 'Employee created successfully', employee, 201);
    } catch (error) {
      next(error);
    }
  }

  static async getEmployees(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const employees = await CompanyAuthService.getEmployees(req.user!.companyId!);
      ApiResponse.success(res, 'Employees fetched successfully', employees);
    } catch (error) {
      next(error);
    }
  }

  static async updateEmployeePermissions(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const updatedEmployee = await CompanyAuthService.updateEmployeePermissions(
        req.user!.companyId!,
        req.params.id,
        req.body.permissions
      );
      ApiResponse.success(res, 'Employee permissions updated successfully', updatedEmployee);
    } catch (error) {
      next(error);
    }
  }

  static async updateEmployeeStatus(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const employee = await CompanyAuthService.updateEmployeeStatus(
        req.user!.companyId!,
        req.params.id,
        Boolean(req.body.isSuspended)
      );
      ApiResponse.success(res, `Employee account ${employee.isSuspended ? 'blocked' : 'unblocked'} successfully`, employee);
    } catch (error) {
      next(error);
    }
  }

  static async deleteEmployee(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      await CompanyAuthService.deleteEmployee(req.user!.companyId!, req.params.id);
      ApiResponse.success(res, 'Employee deleted successfully', { id: req.params.id });
    } catch (error) {
      next(error);
    }
  }

  static async updateEmployee(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        res.status(400).json({ success: false, errors: errors.array() });
        return;
      }

      const employee = await CompanyAuthService.updateEmployee(req.user!.companyId!, req.params.id, req.body);
      ApiResponse.success(res, 'Employee updated successfully', employee);
    } catch (error) {
      next(error);
    }
  }

  static async createGroup(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const group = await CompanyAuthService.createGroup(req.user!.companyId!, req.user!.id, req.body);
      ApiResponse.success(res, 'Group created successfully', group, 201);
    } catch (error) {
      next(error);
    }
  }

  static async updateGroup(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) { res.status(400).json({ success: false, errors: errors.array() }); return; }
      const group = await CompanyAuthService.updateGroup(req.user!.companyId!, req.params.groupId, req.body);
      ApiResponse.success(res, 'Group updated successfully', group);
    } catch (error) { next(error); }
  }

  static async deleteGroup(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      await CompanyAuthService.deleteGroup(req.user!.companyId!, req.params.groupId);
      ApiResponse.success(res, 'Group deleted successfully', { id: req.params.groupId });
    } catch (error) { next(error); }
  }

  static async postMessage(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const message = await CompanyAuthService.postGroupMessage(
        req.user!.companyId!,
        req.user!.id,
        req.user!.role,
        req.params.groupId,
        req.body
      );
      ApiResponse.success(res, 'Message posted successfully', message, 201);
    } catch (error) {
      next(error);
    }
  }

  static async getGroupMessages(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const messages = await CompanyAuthService.getGroupMessages(
        req.user!.companyId!,
        req.user!.id,
        req.user!.role,
        req.params.groupId
      );
      ApiResponse.success(res, 'Group messages fetched successfully', messages);
    } catch (error) {
      next(error);
    }
  }

  static async getConversationMessages(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const messages = await CompanyAuthService.getConversationMessages(req.user!.companyId!, req.user!.id, req.user!.role, req.params.conversationId);
      ApiResponse.success(res, 'Conversation messages fetched successfully', messages);
    } catch (error) { next(error); }
  }

  static async postConversationMessage(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) { res.status(400).json({ success: false, errors: errors.array() }); return; }
      const message = await CompanyAuthService.postConversationMessage(req.user!.companyId!, req.user!.id, req.user!.role, req.params.conversationId, req.body.content);
      ApiResponse.success(res, 'Message posted successfully', message, 201);
    } catch (error) { next(error); }
  }

  static async updateMessage(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) { res.status(400).json({ success: false, errors: errors.array() }); return; }
      const message = await CompanyAuthService.updateMessage(req.user!.companyId!, req.user!.id, req.params.messageId, req.body.content);
      ApiResponse.success(res, 'Message updated successfully', message);
    } catch (error) { next(error); }
  }

  static async deleteMessage(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const result = await CompanyAuthService.deleteMessage(req.user!.companyId!, req.user!.id, req.params.messageId);
      ApiResponse.success(res, 'Message deleted successfully', result);
    } catch (error) { next(error); }
  }
}
