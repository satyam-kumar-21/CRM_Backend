"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.Upgrade = void 0;
const mongoose_1 = require("mongoose");
const tenantPlugin_1 = require("../plugins/tenantPlugin");
const UpgradeSchema = new mongoose_1.Schema({
    companyId: { type: mongoose_1.Schema.Types.ObjectId, required: true, ref: 'Company' },
    customerId: { type: String, required: true, trim: true },
    customerName: { type: String, required: true, trim: true },
    salesEmployeeId: { type: mongoose_1.Schema.Types.ObjectId, required: true, ref: 'Employee' },
    salesEmployeeName: { type: String, required: true, trim: true },
    upgradedBy: { type: mongoose_1.Schema.Types.ObjectId, ref: 'Employee', default: null },
    upgradedByName: { type: String, default: '', trim: true },
    originalSaleId: { type: mongoose_1.Schema.Types.ObjectId, ref: 'Sale', default: null },
    leadId: { type: mongoose_1.Schema.Types.ObjectId, ref: 'Lead', default: null },
    upgradeNumber: { type: Number, default: 1 },
    upgradeAmount: { type: Number, default: 0 },
    salesTaxType: { type: String, enum: ['PERCENTAGE', 'DIRECT_AMOUNT'], default: 'PERCENTAGE' },
    salesTaxValue: { type: Number, default: 0 },
    salesTaxAmount: { type: Number, default: 0 },
    finalAmount: { type: Number, default: 0 },
    paymentMethod: { type: String, enum: ['Card', 'Check', 'Wire Transfer', 'Cash', 'UPI', 'Bank Transfer', 'Online', 'Other'], default: 'Card' },
    salesEmployeeRemark: { type: String, default: '', trim: true },
    status: { type: String, enum: ['PENDING', 'IN_PROGRESS', 'SUCCESSFUL', 'FAILED', 'COMPLETED'], default: 'PENDING' },
    techSupportStatus: { type: String, enum: ['NONE', 'PENDING', 'ACCEPTED', 'SUCCESSFUL', 'FAILED'], default: 'NONE' },
    techSupportEmployeeId: { type: mongoose_1.Schema.Types.ObjectId, ref: 'Employee', default: null },
    techSupportEmployeeName: { type: String, default: '', trim: true },
    verificationStatus: { type: String, enum: ['PENDING', 'IN_PROGRESS', 'SUCCESSFUL', 'FAILED'], default: 'PENDING' },
    verificationEmployeeId: { type: mongoose_1.Schema.Types.ObjectId, ref: 'Employee', default: null },
    verificationEmployeeName: { type: String, default: '', trim: true },
    feedbackStatus: { type: String, enum: ['PENDING', 'COMPLETED'], default: 'PENDING' },
}, { timestamps: true });
UpgradeSchema.plugin(tenantPlugin_1.tenantPlugin);
UpgradeSchema.index({ companyId: 1, customerId: 1, upgradeNumber: 1 }, { unique: true, sparse: true });
exports.Upgrade = (0, mongoose_1.model)('Upgrade', UpgradeSchema);
