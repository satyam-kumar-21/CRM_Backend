"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.createLeaveValidation = exports.markSaleFailedValidation = exports.saleValidation = exports.updateLeadValidation = exports.leadValidation = exports.postMessageValidation = exports.updateGroupValidation = exports.createGroupValidation = exports.updateEmployeeValidation = exports.createEmployeeValidation = exports.companyLoginValidation = void 0;
const express_validator_1 = require("express-validator");
const index_1 = require("../constants/index");
const normalizeRole = (value) => {
    if (typeof value !== 'string')
        return value;
    const normalized = value.trim().toUpperCase().replace(/[ -]+/g, '_');
    return normalized === 'TECHNOLOGY_SUPPORT' ? index_1.Roles.TECH_SUPPORT : normalized;
};
exports.companyLoginValidation = [
    (0, express_validator_1.body)('password').notEmpty().withMessage('Password is required'),
    (0, express_validator_1.body)().custom((_, { req }) => {
        if (!req.body.employeeId && !req.body.email) {
            throw new Error('Either employeeId or email is required');
        }
        return true;
    }),
    (0, express_validator_1.body)('email').optional().isEmail().withMessage('Please provide a valid email address'),
];
exports.createEmployeeValidation = [
    (0, express_validator_1.body)('name').trim().notEmpty().withMessage('Employee name is required'),
    (0, express_validator_1.body)('email').optional().isEmail().withMessage('Valid employee email is required'),
    (0, express_validator_1.body)('phone').trim().notEmpty().withMessage('Employee phone number is required'),
    (0, express_validator_1.body)('role')
        .customSanitizer(normalizeRole)
        .isIn(Object.values(index_1.Roles))
        .withMessage('Valid employee role is required'),
    (0, express_validator_1.body)('password').isLength({ min: 6 }).withMessage('Employee password must be at least 6 characters'),
    (0, express_validator_1.body)('monthlySalesTarget').optional().isFloat({ min: 0 }).withMessage('monthlySalesTarget must be a positive number'),
    (0, express_validator_1.body)('remoteTarget').optional().isFloat({ min: 0 }).withMessage('remoteTarget must be a positive number'),
];
exports.updateEmployeeValidation = [
    (0, express_validator_1.body)('name').optional().trim().notEmpty().withMessage('Employee name cannot be empty'),
    (0, express_validator_1.body)('email').optional().isEmail().withMessage('Valid employee email is required'),
    (0, express_validator_1.body)('phone').optional().trim().notEmpty().withMessage('Employee phone number cannot be empty'),
    (0, express_validator_1.body)('role').optional().customSanitizer(normalizeRole).isIn(Object.values(index_1.Roles)).withMessage('Valid employee role is required'),
    (0, express_validator_1.body)('password').optional().isLength({ min: 6 }).withMessage('Employee password must be at least 6 characters'),
    (0, express_validator_1.body)('monthlySalesTarget').optional().isFloat({ min: 0 }).withMessage('monthlySalesTarget must be a positive number'),
    (0, express_validator_1.body)('remoteTarget').optional().isFloat({ min: 0 }).withMessage('remoteTarget must be a positive number'),
];
exports.createGroupValidation = [
    (0, express_validator_1.body)('name').trim().notEmpty().withMessage('Group name is required'),
    (0, express_validator_1.body)('description').optional().trim(),
    (0, express_validator_1.body)('privacy').optional().isIn(['public', 'private']).withMessage('Privacy must be public or private'),
    (0, express_validator_1.body)('memberIds').optional().isArray().withMessage('memberIds must be an array'),
];
exports.updateGroupValidation = [
    (0, express_validator_1.body)('name').optional().trim().notEmpty().withMessage('Group name cannot be empty'),
    (0, express_validator_1.body)('description').optional().trim(),
    (0, express_validator_1.body)('privacy').optional().isIn(['public', 'private']).withMessage('Privacy must be public or private'),
    (0, express_validator_1.body)('memberIds').optional().isArray().withMessage('memberIds must be an array'),
];
exports.postMessageValidation = [
    (0, express_validator_1.body)('content').trim().notEmpty().withMessage('Message content is required'),
];
exports.leadValidation = [
    (0, express_validator_1.body)('name').trim().notEmpty().withMessage('Lead name is required'),
    (0, express_validator_1.body)('country').trim().notEmpty().withMessage('Lead country is required'),
    (0, express_validator_1.body)('system').trim().notEmpty().withMessage('Lead system is required'),
    (0, express_validator_1.body)('contactNo').trim().notEmpty().withMessage('Lead contact number is required'),
    (0, express_validator_1.body)('otherDetails').optional().trim(),
    (0, express_validator_1.body)('connected').isIn(['yes', 'no']).withMessage('Connected must be yes or no'),
    (0, express_validator_1.body)('connectedBy').trim().notEmpty().withMessage('Connected by is required'),
    (0, express_validator_1.body)('isSale').isIn(['yes', 'no']).withMessage('Sale status must be yes or no'),
];
// Separate validator for PATCH /leads/:id — all fields optional
exports.updateLeadValidation = [
    (0, express_validator_1.body)('name').optional().trim().notEmpty().withMessage('Lead name cannot be empty'),
    (0, express_validator_1.body)('country').optional().trim().notEmpty().withMessage('Lead country cannot be empty'),
    (0, express_validator_1.body)('system').optional().trim().notEmpty().withMessage('Lead system cannot be empty'),
    (0, express_validator_1.body)('contactNo').optional().trim().notEmpty().withMessage('Lead contact number cannot be empty'),
    (0, express_validator_1.body)('otherDetails').optional().trim(),
    (0, express_validator_1.body)('customerEmail').optional().trim(),
    (0, express_validator_1.body)('alternateContactNo').optional().trim(),
    (0, express_validator_1.body)('customerAddress').optional().trim(),
    (0, express_validator_1.body)('issues').optional().trim(),
    (0, express_validator_1.body)('plan').optional().trim(),
    (0, express_validator_1.body)('paymentMerchant').optional().trim(),
    (0, express_validator_1.body)('connected').optional().isIn(['yes', 'no']).withMessage('Connected must be yes or no'),
    (0, express_validator_1.body)('connectedBy').optional().trim(),
    (0, express_validator_1.body)('isSale').optional().isIn(['yes', 'no']).withMessage('Sale status must be yes or no'),
    (0, express_validator_1.body)('saleAmount').optional().isFloat({ min: 0 }).withMessage('Sale amount must be a positive number'),
    (0, express_validator_1.body)('mainAmount').optional().isFloat({ min: 0 }).withMessage('Main amount must be a positive number'),
    (0, express_validator_1.body)('upgradedAmount').optional().isFloat({ min: 0 }).withMessage('Upgraded amount must be a positive number'),
    (0, express_validator_1.body)('salesTaxType').optional().isIn(['PERCENTAGE', 'DIRECT_AMOUNT']).withMessage('Sales tax type must be PERCENTAGE or DIRECT_AMOUNT'),
    (0, express_validator_1.body)('salesTaxValue').optional().isFloat({ min: 0 }).withMessage('Sales tax value must be a positive number'),
    (0, express_validator_1.body)('salesTaxAmount').optional().isFloat({ min: 0 }).withMessage('Sales tax amount must be a positive number'),
    (0, express_validator_1.body)('finalAmount').optional().isFloat({ min: 0 }).withMessage('Final amount must be a positive number'),
    (0, express_validator_1.body)('salePaymentMethod').optional().isIn(['Card', 'Check', 'Wire Transfer', 'Cash', 'UPI', 'Bank Transfer', 'Online', 'Other']).withMessage('Invalid payment method'),
    (0, express_validator_1.body)('techSupportStatus').optional().isIn(['NONE', 'PENDING', 'ACCEPTED', 'SUCCESSFUL', 'FAILED']).withMessage('Invalid tech support status'),
    (0, express_validator_1.body)('status').optional().isIn(['OPEN', 'COMPLETED']).withMessage('Invalid lead status'),
    (0, express_validator_1.body)('paymentConfirmed').optional().isIn(['yes', 'no']).withMessage('Payment confirmed must be yes or no'),
    (0, express_validator_1.body)('finalStatus').optional().isIn(['PENDING_PAYMENT', 'CLOSED', 'PAYMENT_FAILED']).withMessage('Invalid final status'),
];
exports.saleValidation = [
    (0, express_validator_1.body)('name').trim().notEmpty().withMessage('Customer name is required'),
    (0, express_validator_1.body)('country').trim().notEmpty().withMessage('Customer country is required'),
    (0, express_validator_1.body)('system').trim().notEmpty().withMessage('Purchased system is required'),
    (0, express_validator_1.body)('connectedBy').trim().notEmpty().withMessage('Closed by is required'),
    (0, express_validator_1.body)('amount').isFloat({ min: 0 }).withMessage('Sale amount must be a positive number'),
    (0, express_validator_1.body)('paymentMethod').isIn(['Card', 'Check', 'Wire Transfer', 'Cash', 'UPI', 'Bank Transfer', 'Online', 'Other']).withMessage('Valid payment method is required'),
    (0, express_validator_1.body)('saleDate').isISO8601().withMessage('Valid sale date is required'),
    (0, express_validator_1.body)('customerId').optional().trim(),
    (0, express_validator_1.body)('customerEmail').optional().trim(),
    (0, express_validator_1.body)('alternateContactNo').optional().trim(),
    (0, express_validator_1.body)('customerAddress').optional().trim(),
    (0, express_validator_1.body)('issues').optional().trim(),
    (0, express_validator_1.body)('plan').optional().trim(),
    (0, express_validator_1.body)('paymentMerchant').optional().trim(),
];
exports.markSaleFailedValidation = [
    (0, express_validator_1.body)('failed').optional().isBoolean().withMessage('Failed must be a boolean'),
    (0, express_validator_1.body)('saleStatus').optional().isIn(['PENDING', 'CHARGED', 'DROPPED']).withMessage('Sale status must be PENDING, CHARGED or DROPPED'),
    (0, express_validator_1.body)('failedReason').optional().trim(),
    (0, express_validator_1.body)().custom((value) => {
        const saleStatus = value.saleStatus || (value.failed === true ? 'DROPPED' : 'CHARGED');
        if (saleStatus === 'DROPPED' && (!value.failedReason || !String(value.failedReason).trim())) {
            throw new Error('Dropped reason is required when a sale is marked as dropped');
        }
        return true;
    }),
];
exports.createLeaveValidation = [
    (0, express_validator_1.body)('leaveType').isIn(['CASUAL', 'SICK', 'MATERNITY', 'ANNUAL']).withMessage('Valid leave type is required'),
    (0, express_validator_1.body)('startDate').isISO8601().withMessage('Valid start date is required'),
    (0, express_validator_1.body)('endDate')
        .isISO8601()
        .withMessage('Valid end date is required')
        .custom((value, { req }) => new Date(value) >= new Date(req.body.startDate))
        .withMessage('End date must be the same or after the start date'),
    (0, express_validator_1.body)('reason').trim().notEmpty().withMessage('Leave reason is required'),
];
