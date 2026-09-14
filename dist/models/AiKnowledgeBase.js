"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.AiKnowledgeBase = void 0;
const mongoose_1 = require("mongoose");
const tenantPlugin_1 = require("../plugins/tenantPlugin");
const AiKnowledgeBaseSchema = new mongoose_1.Schema({
    name: { type: String, required: true, trim: true },
    description: { type: String, default: '', trim: true },
    campaignId: { type: mongoose_1.Schema.Types.ObjectId, ref: 'AiConnection' },
    connectedCampaign: { type: String, trim: true },
    isActive: { type: Boolean, default: true },
    sourceCount: { type: Number, default: 0 },
    lastIndexedAt: { type: Date },
    createdBy: { type: mongoose_1.Schema.Types.ObjectId, ref: 'Employee' },
}, { timestamps: true });
AiKnowledgeBaseSchema.plugin(tenantPlugin_1.tenantPlugin);
exports.AiKnowledgeBase = (0, mongoose_1.model)('AiKnowledgeBase', AiKnowledgeBaseSchema);
