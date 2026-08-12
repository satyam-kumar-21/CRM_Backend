import { body } from 'express-validator';
import { Roles } from '../constants/index';

export const createRemoteSupportValidation = [
  body('customerName').trim().notEmpty().withMessage('Customer name is required'),
  body('customerContact').trim().notEmpty().withMessage('Customer contact is required'),
  body('salesEmployeeId').trim().notEmpty().withMessage('Sales employee is required'),
  body('salesEmployeeName').trim().notEmpty().withMessage('Sales employee name is required'),
  body('dateTime').trim().notEmpty().withMessage('Date and time are required').isISO8601().withMessage('Date and time must be valid'),
  body('issueReason').trim().notEmpty().withMessage('Issue or reason is required'),
  body('status').optional().isIn(['PENDING', 'IN_PROGRESS', 'SUCCESSFUL', 'FAILED', 'REJECTED']).withMessage('Valid status is required'),
  body('techSupportEmployeeId').optional().trim().notEmpty(),
  body('failedReason').optional().trim().notEmpty().withMessage('Failed reason is required when remote support fails'),
  body('rejectedReason').optional().trim().notEmpty().withMessage('Rejected reason is required when remote support is rejected'),
];

export const updateRemoteSupportValidation = [
  body('status').optional().isIn(['PENDING', 'IN_PROGRESS', 'SUCCESSFUL', 'FAILED', 'REJECTED']).withMessage('Valid status is required'),
  body('techSupportEmployeeId').optional().trim().notEmpty(),
  body('failedReason').optional().trim().notEmpty().withMessage('Failed reason is required when remote support fails'),
  body('rejectedReason').optional().trim().notEmpty().withMessage('Rejected reason is required when remote support is rejected'),
];
