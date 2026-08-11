"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.updateProjectValidation = exports.createProjectValidation = void 0;
const express_validator_1 = require("express-validator");
exports.createProjectValidation = [
    (0, express_validator_1.body)('name').trim().notEmpty().withMessage('Project name is required'),
    (0, express_validator_1.body)('description').trim().notEmpty().withMessage('Project description is required'),
    (0, express_validator_1.body)('status').isIn(['PLANNING', 'IN_PROGRESS', 'COMPLETED', 'ON_HOLD']).withMessage('Valid project status is required'),
    (0, express_validator_1.body)('assignedEmployeeIds').isArray().withMessage('Assigned employees must be an array'),
    (0, express_validator_1.body)('assignedEmployeeIds.*').trim().notEmpty().withMessage('Assigned employee IDs must be valid'),
    (0, express_validator_1.body)('startDate').trim().notEmpty().withMessage('Start date is required').isISO8601().withMessage('Start date must be valid'),
    (0, express_validator_1.body)('endDate').trim().notEmpty().withMessage('End date is required').isISO8601().withMessage('End date must be valid'),
    (0, express_validator_1.body)('progress').optional().isInt({ min: 0, max: 100 }).withMessage('Progress must be between 0 and 100'),
];
exports.updateProjectValidation = [
    (0, express_validator_1.body)('name').optional().trim().notEmpty().withMessage('Project name cannot be empty'),
    (0, express_validator_1.body)('description').optional().trim().notEmpty().withMessage('Project description cannot be empty'),
    (0, express_validator_1.body)('status').optional().isIn(['PLANNING', 'IN_PROGRESS', 'COMPLETED', 'ON_HOLD']).withMessage('Valid project status is required'),
    (0, express_validator_1.body)('assignedEmployeeIds').optional().isArray().withMessage('Assigned employees must be an array'),
    (0, express_validator_1.body)('assignedEmployeeIds.*').optional().trim().notEmpty().withMessage('Assigned employee IDs must be valid'),
    (0, express_validator_1.body)('startDate').optional().trim().isISO8601().withMessage('Start date must be valid'),
    (0, express_validator_1.body)('endDate').optional().trim().isISO8601().withMessage('End date must be valid'),
    (0, express_validator_1.body)('progress').optional().isInt({ min: 0, max: 100 }).withMessage('Progress must be between 0 and 100'),
];
