"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.Lead = void 0;
const mongoose_1 = require("mongoose");
const tenantPlugin_1 = require("../plugins/tenantPlugin");
const LeadSchema = new mongoose_1.Schema({
    name: { type: String, required: true, trim: true },
    country: { type: String, required: true, trim: true },
    system: { type: String, required: true, trim: true },
    contactNo: { type: String, required: true, trim: true },
    otherDetails: { type: String, default: '', trim: true },
    customerEmail: { type: String, default: '', trim: true, lowercase: true },
    alternateContactNo: { type: String, default: '', trim: true },
    customerAddress: { type: String, default: '', trim: true },
    issues: { type: String, default: '', trim: true },
    plan: { type: String, default: '', trim: true },
    paymentMerchant: { type: String, default: '', trim: true },
    connected: { type: String, enum: ['yes', 'no'], default: 'no' },
    connectedBy: { type: String, required: true, trim: true },
    assignedTo: { type: mongoose_1.Schema.Types.ObjectId, ref: 'Employee' },
    assignedToName: { type: String, default: '', trim: true },
    acceptedAt: { type: Date },
    customerType: { type: String, enum: ['NEW', 'EXISTING_CUSTOMER', 'UPGRADE'], default: 'NEW' },
    isSale: { type: String, enum: ['yes', 'no'], default: 'no' },
    saleAmount: { type: Number },
    salePaymentMethod: { type: String, enum: ['Card', 'Check', 'Wire Transfer', 'Cash', 'UPI', 'Bank Transfer', 'Online', 'Other'] },
    techSupportStatus: { type: String, enum: ['NONE', 'PENDING', 'ACCEPTED', 'SUCCESSFUL', 'FAILED'], default: 'NONE' },
    techSupportEmployeeId: { type: mongoose_1.Schema.Types.ObjectId, ref: 'Employee' },
    techSupportEmployeeName: { type: String, default: '', trim: true },
    techSupportCompletedAt: { type: Date },
    paymentConfirmed: { type: String, enum: ['yes', 'no'] },
    finalStatus: { type: String, enum: ['PENDING_PAYMENT', 'CLOSED', 'PAYMENT_FAILED'] },
    status: { type: String, enum: ['OPEN', 'COMPLETED'], default: 'OPEN' },
    completionReason: { type: String, default: '' },
    salesEmployeeRemark: { type: String, default: '', trim: true },
    workflowMessageId: { type: String, trim: true },
}, { timestamps: true });
LeadSchema.plugin(tenantPlugin_1.tenantPlugin);
LeadSchema.index({ companyId: 1, workflowMessageId: 1 }, { unique: true, sparse: true });
exports.Lead = (0, mongoose_1.model)('Lead', LeadSchema);
