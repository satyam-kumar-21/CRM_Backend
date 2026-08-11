"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ProjectController = void 0;
const express_validator_1 = require("express-validator");
const projectService_1 = require("../services/projectService");
const responseHandler_1 = require("../utils/responseHandler");
class ProjectController {
    static async list(req, res, next) {
        try {
            const projects = await projectService_1.ProjectService.list(req.user.companyId, req.user.role, req.user.id);
            responseHandler_1.ApiResponse.success(res, 'Projects fetched successfully', projects);
        }
        catch (error) {
            next(error);
        }
    }
    static async create(req, res, next) {
        try {
            const errors = (0, express_validator_1.validationResult)(req);
            if (!errors.isEmpty()) {
                res.status(400).json({ success: false, errors: errors.array() });
                return;
            }
            const project = await projectService_1.ProjectService.create(req.user.companyId, {
                name: req.body.name,
                description: req.body.description,
                status: req.body.status,
                assignedEmployeeIds: req.body.assignedEmployeeIds || [],
                startDate: new Date(req.body.startDate),
                endDate: new Date(req.body.endDate),
                progress: req.body.progress ?? 0,
                createdById: req.user.id,
            });
            responseHandler_1.ApiResponse.success(res, 'Project created successfully', project, 201);
        }
        catch (error) {
            next(error);
        }
    }
    static async update(req, res, next) {
        try {
            const errors = (0, express_validator_1.validationResult)(req);
            if (!errors.isEmpty()) {
                res.status(400).json({ success: false, errors: errors.array() });
                return;
            }
            const project = await projectService_1.ProjectService.update(req.user.companyId, req.params.id, {
                name: req.body.name,
                description: req.body.description,
                status: req.body.status,
                assignedEmployeeIds: req.body.assignedEmployeeIds,
                startDate: req.body.startDate ? new Date(req.body.startDate) : undefined,
                endDate: req.body.endDate ? new Date(req.body.endDate) : undefined,
                progress: req.body.progress,
            });
            responseHandler_1.ApiResponse.success(res, 'Project updated successfully', project);
        }
        catch (error) {
            next(error);
        }
    }
}
exports.ProjectController = ProjectController;
