import { body } from 'express-validator';
import { Roles } from '../constants/index';

const normalizeRole = (value: unknown) => {
  if (typeof value !== 'string') return value;
  const normalized = value.trim().toUpperCase().replace(/[ -]+/g, '_');
  return normalized === 'TECHNOLOGY_SUPPORT' ? Roles.TECH_SUPPORT : normalized;
};

export const companyLoginValidation = [
  body('password').notEmpty().withMessage('Password is required'),
  body().custom((_, { req }) => {
    if (!req.body.employeeId && !req.body.email) {
      throw new Error('Either employeeId or email is required');
    }
    return true;
  }),
  body('email').optional().isEmail().withMessage('Please provide a valid email address'),
];

export const verifyLoginOtpValidation = [
  body('otpToken').notEmpty().withMessage('OTP session token is required'),
  body('otp').trim().notEmpty().withMessage('OTP is required').isLength({ min: 6, max: 6 }).withMessage('OTP must be 6 digits'),
];

export const createEmployeeValidation = [
  body('name').trim().notEmpty().withMessage('Employee name is required'),
  body('email').optional().isEmail().withMessage('Valid employee email is required'),
  body('phone').trim().notEmpty().withMessage('Employee phone number is required'),
  body('role')
    .customSanitizer(normalizeRole)
    .isIn(Object.values(Roles))
    .withMessage('Valid employee role is required'),
  body('password').isLength({ min: 6 }).withMessage('Employee password must be at least 6 characters'),
  body('monthlySalesTarget').optional().isFloat({ min: 0 }).withMessage('monthlySalesTarget must be a positive number'),
  body('remoteTarget').optional().isFloat({ min: 0 }).withMessage('remoteTarget must be a positive number'),
];

export const updateEmployeeValidation = [
  body('name').optional().trim().notEmpty().withMessage('Employee name cannot be empty'),
  body('email').optional().isEmail().withMessage('Valid employee email is required'),
  body('phone').optional().trim().notEmpty().withMessage('Employee phone number cannot be empty'),
  body('role').optional().customSanitizer(normalizeRole).isIn(Object.values(Roles)).withMessage('Valid employee role is required'),
  body('password').optional().isLength({ min: 6 }).withMessage('Employee password must be at least 6 characters'),
  body('monthlySalesTarget').optional().isFloat({ min: 0 }).withMessage('monthlySalesTarget must be a positive number'),
  body('remoteTarget').optional().isFloat({ min: 0 }).withMessage('remoteTarget must be a positive number'),
];

export const createGroupValidation = [
  body('name').trim().notEmpty().withMessage('Group name is required'),
  body('description').optional().trim(),
  body('privacy').optional().isIn(['public', 'private']).withMessage('Privacy must be public or private'),
  body('memberIds').optional().isArray().withMessage('memberIds must be an array'),
];

export const updateGroupValidation = [
  body('name').optional().trim().notEmpty().withMessage('Group name cannot be empty'),
  body('description').optional().trim(),
  body('privacy').optional().isIn(['public', 'private']).withMessage('Privacy must be public or private'),
  body('memberIds').optional().isArray().withMessage('memberIds must be an array'),
];

export const postMessageValidation = [
  body('content').trim().notEmpty().withMessage('Message content is required'),
];

export const leadValidation = [
  body('name').trim().notEmpty().withMessage('Lead name is required'),
  body('country').trim().notEmpty().withMessage('Lead country is required'),
  body('system').trim().notEmpty().withMessage('Lead system is required'),
  body('contactNo').trim().notEmpty().withMessage('Lead contact number is required'),
  body('otherDetails').optional().trim(),
  body('connected').isIn(['yes', 'no']).withMessage('Connected must be yes or no'),
  body('connectedBy').trim().notEmpty().withMessage('Connected by is required'),
  body('isSale').isIn(['yes', 'no']).withMessage('Sale status must be yes or no'),
];

// Separate validator for PATCH /leads/:id — all fields optional
export const updateLeadValidation = [
  body('name').optional().trim().notEmpty().withMessage('Lead name cannot be empty'),
  body('country').optional().trim().notEmpty().withMessage('Lead country cannot be empty'),
  body('system').optional().trim().notEmpty().withMessage('Lead system cannot be empty'),
  body('contactNo').optional().trim().notEmpty().withMessage('Lead contact number cannot be empty'),
  body('otherDetails').optional().trim(),
  body('customerEmail').optional().trim(),
  body('alternateContactNo').optional().trim(),
  body('customerAddress').optional().trim(),
  body('issues').optional().trim(),
  body('plan').optional().trim(),
  body('paymentMerchant').optional().trim(),
  body('connected').optional().isIn(['yes', 'no']).withMessage('Connected must be yes or no'),
  body('connectedBy').optional().trim(),
  body('isSale').optional().isIn(['yes', 'no']).withMessage('Sale status must be yes or no'),
  body('saleAmount').optional().isFloat({ min: 0 }).withMessage('Sale amount must be a positive number'),
  body('mainAmount').optional().isFloat({ min: 0 }).withMessage('Main amount must be a positive number'),
  body('upgradedAmount').optional().isFloat({ min: 0 }).withMessage('Upgraded amount must be a positive number'),
  body('salesTaxType').optional().isIn(['PERCENTAGE', 'DIRECT_AMOUNT']).withMessage('Sales tax type must be PERCENTAGE or DIRECT_AMOUNT'),
  body('salesTaxValue').optional().isFloat({ min: 0 }).withMessage('Sales tax value must be a positive number'),
  body('salesTaxAmount').optional().isFloat({ min: 0 }).withMessage('Sales tax amount must be a positive number'),
  body('finalAmount').optional().isFloat({ min: 0 }).withMessage('Final amount must be a positive number'),
  body('salePaymentMethod').optional().isIn(['Card', 'Check', 'Wire Transfer', 'Cash', 'UPI', 'Bank Transfer', 'Online', 'Other']).withMessage('Invalid payment method'),
  body('techSupportStatus').optional().isIn(['NONE', 'PENDING', 'ACCEPTED', 'SUCCESSFUL', 'FAILED']).withMessage('Invalid tech support status'),
  body('status').optional().isIn(['OPEN', 'COMPLETED']).withMessage('Invalid lead status'),
  body('paymentConfirmed').optional().isIn(['yes', 'no']).withMessage('Payment confirmed must be yes or no'),
  body('finalStatus').optional().isIn(['PENDING_PAYMENT', 'CLOSED', 'PAYMENT_FAILED']).withMessage('Invalid final status'),
];

export const saleValidation = [
  body('name').trim().notEmpty().withMessage('Customer name is required'),
  body('country').trim().notEmpty().withMessage('Customer country is required'),
  body('system').trim().notEmpty().withMessage('Purchased system is required'),
  body('connectedBy').trim().notEmpty().withMessage('Closed by is required'),
  body('amount').isFloat({ min: 0 }).withMessage('Sale amount must be a positive number'),
  body('paymentMethod').isIn(['Card', 'Check', 'Wire Transfer', 'Cash', 'UPI', 'Bank Transfer', 'Online', 'Other']).withMessage('Valid payment method is required'),
  body('saleDate').isISO8601().withMessage('Valid sale date is required'),
  body('customerId').optional().trim(),
  body('customerEmail').optional().trim(),
  body('alternateContactNo').optional().trim(),
  body('customerAddress').optional().trim(),
  body('issues').optional().trim(),
  body('plan').optional().trim(),
  body('paymentMerchant').optional().trim(),
];

export const markSaleFailedValidation = [
  body('failed').optional().isBoolean().withMessage('Failed must be a boolean'),
  body('saleStatus').optional().isIn(['PENDING', 'CHARGED', 'DROPPED']).withMessage('Sale status must be PENDING, CHARGED or DROPPED'),
  body('failedReason').optional().trim(),
  body().custom((value) => {
    const saleStatus = value.saleStatus || (value.failed === true ? 'DROPPED' : 'CHARGED');
    if (saleStatus === 'DROPPED' && (!value.failedReason || !String(value.failedReason).trim())) {
      throw new Error('Dropped reason is required when a sale is marked as dropped');
    }
    return true;
  }),
];

export const createLeaveValidation = [
  body('leaveType').isIn(['CASUAL', 'SICK', 'MATERNITY', 'ANNUAL']).withMessage('Valid leave type is required'),
  body('startDate').isISO8601().withMessage('Valid start date is required'),
  body('endDate')
    .isISO8601()
    .withMessage('Valid end date is required')
    .custom((value, { req }) => new Date(value) >= new Date(req.body.startDate))
    .withMessage('End date must be the same or after the start date'),
  body('reason').trim().notEmpty().withMessage('Leave reason is required'),
];
