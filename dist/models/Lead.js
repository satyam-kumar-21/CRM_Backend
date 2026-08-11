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
    connected: { type: String, enum: ['yes', 'no'], default: 'no' },
    connectedBy: { type: String, required: true, trim: true },
    isSale: { type: String, enum: ['yes', 'no'], default: 'no' },
    workflowMessageId: { type: String, trim: true },
}, { timestamps: true });
LeadSchema.plugin(tenantPlugin_1.tenantPlugin);
LeadSchema.index({ companyId: 1, workflowMessageId: 1 }, { unique: true, sparse: true });
exports.Lead = (0, mongoose_1.model)('Lead', LeadSchema);
