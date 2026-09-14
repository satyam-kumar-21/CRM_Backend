"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.AiConversation = void 0;
const mongoose_1 = require("mongoose");
const tenantPlugin_1 = require("../plugins/tenantPlugin");
const AiConversationSchema = new mongoose_1.Schema({
    connectionId: { type: mongoose_1.Schema.Types.ObjectId, ref: 'AiConnection' },
    campaignName: { type: String, trim: true },
    knowledgeBaseId: { type: mongoose_1.Schema.Types.ObjectId, ref: 'AiKnowledgeBase' },
    jivoChatId: { type: String, trim: true },
    customerId: { type: String, trim: true },
    customerProfile: { type: mongoose_1.Schema.Types.Mixed, default: {} },
    messages: [
        {
            role: { type: String, enum: ['user', 'assistant', 'system'], required: true },
            content: { type: String, required: true },
            timestamp: { type: Date, default: Date.now },
            metadata: { type: mongoose_1.Schema.Types.Mixed, default: {} },
        }
    ],
    status: { type: String, enum: ['AI_ACTIVE', 'AI_TO_HUMAN', 'HUMAN', 'CLOSED'], default: 'AI_ACTIVE' },
    leadReady: { type: Boolean, default: false },
    handoffRequired: { type: Boolean, default: false },
    leadId: { type: mongoose_1.Schema.Types.ObjectId, ref: 'Lead' },
    activeGroupId: { type: mongoose_1.Schema.Types.ObjectId, ref: 'Group' },
    source: { type: String, enum: ['JIVO_CHAT'], default: 'JIVO_CHAT' },
    knowledgeUsed: [{ type: String }],
    lastError: { type: String, default: '' },
}, { timestamps: true });
AiConversationSchema.plugin(tenantPlugin_1.tenantPlugin);
AiConversationSchema.index({ companyId: 1, jivoChatId: 1 }, { unique: true, sparse: true });
exports.AiConversation = (0, mongoose_1.model)('AiConversation', AiConversationSchema);
