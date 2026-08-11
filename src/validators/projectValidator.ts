import { body } from 'express-validator';

export const createProjectValidation = [
  body('name').trim().notEmpty().withMessage('Project name is required'),
  body('description').trim().notEmpty().withMessage('Project description is required'),
  body('status').isIn(['PLANNING', 'IN_PROGRESS', 'COMPLETED', 'ON_HOLD']).withMessage('Valid project status is required'),
  body('assignedEmployeeIds').isArray().withMessage('Assigned employees must be an array'),
  body('assignedEmployeeIds.*').trim().notEmpty().withMessage('Assigned employee IDs must be valid'),
  body('startDate').trim().notEmpty().withMessage('Start date is required').isISO8601().withMessage('Start date must be valid'),
  body('endDate').trim().notEmpty().withMessage('End date is required').isISO8601().withMessage('End date must be valid'),
  body('progress').optional().isInt({ min: 0, max: 100 }).withMessage('Progress must be between 0 and 100'),
];

export const updateProjectValidation = [
  body('name').optional().trim().notEmpty().withMessage('Project name cannot be empty'),
  body('description').optional().trim().notEmpty().withMessage('Project description cannot be empty'),
  body('status').optional().isIn(['PLANNING', 'IN_PROGRESS', 'COMPLETED', 'ON_HOLD']).withMessage('Valid project status is required'),
  body('assignedEmployeeIds').optional().isArray().withMessage('Assigned employees must be an array'),
  body('assignedEmployeeIds.*').optional().trim().notEmpty().withMessage('Assigned employee IDs must be valid'),
  body('startDate').optional().trim().isISO8601().withMessage('Start date must be valid'),
  body('endDate').optional().trim().isISO8601().withMessage('End date must be valid'),
  body('progress').optional().isInt({ min: 0, max: 100 }).withMessage('Progress must be between 0 and 100'),
];
