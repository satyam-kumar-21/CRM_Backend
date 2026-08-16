"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.RemoteSupport = void 0;
const mongoose_1 = require("mongoose");
const tenantPlugin_1 = require("../plugins/tenantPlugin");
const RemoteSupportSchema = new mongoose_1.Schema({
    leadId: { type: mongoose_1.Schema.Types.ObjectId, ref: 'Lead', required: false },
    workflowMessageId: { type: String, trim: true, default: '' },
    customerId: { type: String, trim: true, default: '' },
    saleId: { type: mongoose_1.Schema.Types.ObjectId, ref: 'Sale', required: false },
    upgradeId: { type: mongoose_1.Schema.Types.ObjectId, ref: 'Upgrade', required: false },
    customerName: { type: String, required: true, trim: true },
    customerContact: { type: String, required: true, trim: true },
    country: { type: String, trim: true, default: '' },
    system: { type: String, trim: true, default: '' },
    otherDetails: { type: String, trim: true, default: '' },
    salesEmployeeId: { type: mongoose_1.Schema.Types.ObjectId, ref: 'Employee', required: true },
    salesEmployeeName: { type: String, required: true, trim: true },
    techSupportEmployeeId: { type: mongoose_1.Schema.Types.ObjectId, ref: 'Employee', required: false },
    techSupportEmployeeName: { type: String, trim: true, default: '' },
    dateTime: { type: Date, required: true },
    issueReason: { type: String, required: true, trim: true },
    status: { type: String, enum: ['PENDING', 'IN_PROGRESS', 'SUCCESSFUL', 'FAILED', 'REJECTED'], default: 'PENDING' },
    acceptedAt: { type: Date, default: null },
    completedAt: { type: Date, default: null },
    failedReason: { type: String, default: '' },
    failedBy: { type: mongoose_1.Schema.Types.ObjectId, ref: 'Employee', required: false },
    failedByName: { type: String, trim: true, default: '' },
    failedAt: { type: Date, default: null },
    rejectedReason: { type: String, default: '' },
    rejectedBy: { type: mongoose_1.Schema.Types.ObjectId, ref: 'Employee', required: false },
    rejectedByName: { type: String, trim: true, default: '' },
    rejectedAt: { type: Date, default: null },
}, { timestamps: true });
RemoteSupportSchema.plugin(tenantPlugin_1.tenantPlugin);
RemoteSupportSchema.index({ companyId: 1, dateTime: -1 });
exports.RemoteSupport = (0, mongoose_1.model)('RemoteSupport', RemoteSupportSchema);
