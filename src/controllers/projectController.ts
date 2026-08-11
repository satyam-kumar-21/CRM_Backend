import { Request, Response, NextFunction } from 'express';
import { validationResult } from 'express-validator';
import { ProjectService } from '../services/projectService';
import { ApiResponse } from '../utils/responseHandler';
import { AuthenticatedRequest } from '../middlewares/authMiddleware';

export class ProjectController {
  static async list(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const projects = await ProjectService.list(req.user!.companyId!, req.user!.role, req.user!.id);
      ApiResponse.success(res, 'Projects fetched successfully', projects);
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
      const project = await ProjectService.create(req.user!.companyId!, {
        name: req.body.name,
        description: req.body.description,
        status: req.body.status,
        assignedEmployeeIds: req.body.assignedEmployeeIds || [],
        startDate: new Date(req.body.startDate),
        endDate: new Date(req.body.endDate),
        progress: req.body.progress ?? 0,
        createdById: req.user!.id,
      });
      ApiResponse.success(res, 'Project created successfully', project, 201);
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
      const project = await ProjectService.update(req.user!.companyId!, req.params.id, {
        name: req.body.name,
        description: req.body.description,
        status: req.body.status,
        assignedEmployeeIds: req.body.assignedEmployeeIds,
        startDate: req.body.startDate ? new Date(req.body.startDate) : undefined,
        endDate: req.body.endDate ? new Date(req.body.endDate) : undefined,
        progress: req.body.progress,
      });
      ApiResponse.success(res, 'Project updated successfully', project);
    } catch (error) {
      next(error);
    }
  }
}
