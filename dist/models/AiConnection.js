"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.AiConnection = void 0;
const mongoose_1 = require("mongoose");
const tenantPlugin_1 = require("../plugins/tenantPlugin");
const AiConnectionSchema = new mongoose_1.Schema({
    name: { type: String, required: true, trim: true },
    siteId: { type: String, trim: true },
    channelId: { type: String, trim: true },
    providerId: { type: String, trim: true },
    apiEndpoint: { type: String, trim: true },
    apiTokenEncrypted: { type: String, default: '' },
    webhookSecretEncrypted: { type: String, default: '' },
    connectedCampaign: { type: String, trim: true },
    campaignId: { type: mongoose_1.Schema.Types.ObjectId, ref: 'AiKnowledgeBase' },
    salesGroupId: { type: mongoose_1.Schema.Types.ObjectId, ref: 'Group' },
    isActive: { type: Boolean, default: true },
    webhookStatus: { type: String, enum: ['ACTIVE', 'INACTIVE'], default: 'INACTIVE' },
    status: { type: String, enum: ['ACTIVE', 'INACTIVE', 'PENDING'], default: 'PENDING' },
    lastValidatedAt: { type: Date },
    validationNotes: [{ type: String }],
}, { timestamps: true });
AiConnectionSchema.plugin(tenantPlugin_1.tenantPlugin);
exports.AiConnection = (0, mongoose_1.model)('AiConnection', AiConnectionSchema);
