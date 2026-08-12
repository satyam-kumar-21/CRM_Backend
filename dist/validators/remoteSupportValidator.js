"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.updateRemoteSupportValidation = exports.createRemoteSupportValidation = void 0;
const express_validator_1 = require("express-validator");
exports.createRemoteSupportValidation = [
    (0, express_validator_1.body)('customerName').trim().notEmpty().withMessage('Customer name is required'),
    (0, express_validator_1.body)('customerContact').trim().notEmpty().withMessage('Customer contact is required'),
    (0, express_validator_1.body)('salesEmployeeId').trim().notEmpty().withMessage('Sales employee is required'),
    (0, express_validator_1.body)('salesEmployeeName').trim().notEmpty().withMessage('Sales employee name is required'),
    (0, express_validator_1.body)('dateTime').trim().notEmpty().withMessage('Date and time are required').isISO8601().withMessage('Date and time must be valid'),
    (0, express_validator_1.body)('issueReason').trim().notEmpty().withMessage('Issue or reason is required'),
    (0, express_validator_1.body)('status').optional().isIn(['PENDING', 'IN_PROGRESS', 'SUCCESSFUL', 'FAILED', 'REJECTED']).withMessage('Valid status is required'),
    (0, express_validator_1.body)('techSupportEmployeeId').optional().trim().notEmpty(),
    (0, express_validator_1.body)('failedReason').optional().trim().notEmpty().withMessage('Failed reason is required when remote support fails'),
    (0, express_validator_1.body)('rejectedReason').optional().trim().notEmpty().withMessage('Rejected reason is required when remote support is rejected'),
];
exports.updateRemoteSupportValidation = [
    (0, express_validator_1.body)('status').optional().isIn(['PENDING', 'IN_PROGRESS', 'SUCCESSFUL', 'FAILED', 'REJECTED']).withMessage('Valid status is required'),
    (0, express_validator_1.body)('techSupportEmployeeId').optional().trim().notEmpty(),
    (0, express_validator_1.body)('failedReason').optional().trim().notEmpty().withMessage('Failed reason is required when remote support fails'),
    (0, express_validator_1.body)('rejectedReason').optional().trim().notEmpty().withMessage('Rejected reason is required when remote support is rejected'),
];
