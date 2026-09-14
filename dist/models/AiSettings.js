"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.AiSettings = void 0;
const mongoose_1 = require("mongoose");
const tenantPlugin_1 = require("../plugins/tenantPlugin");
const AiSettingsSchema = new mongoose_1.Schema({
    activeModel: { type: String, default: 'llama3.1' },
    modelEndpoint: { type: String, default: 'http://localhost:11434/api/generate' },
    temperature: { type: Number, default: 0.3 },
    maxContext: { type: Number, default: 4000 },
    retrievalCount: { type: Number, default: 5 },
    similarityThreshold: { type: Number, default: 0.2 },
    conversationHistoryLength: { type: Number, default: 20 },
    defaultSystemPrompt: {
        type: String,
        default: 'You are an AI customer support and sales assistant for this campaign. Answer using only the provided knowledge base. If the answer is not in the knowledge base, admit that you do not know and request a human handoff when appropriate.',
    },
    humanHandoffRules: { type: mongoose_1.Schema.Types.Mixed, default: {} },
    leadCompletionRules: { type: mongoose_1.Schema.Types.Mixed, default: {} },
    campaignOverrides: { type: mongoose_1.Schema.Types.Mixed, default: {} },
}, { timestamps: true });
AiSettingsSchema.plugin(tenantPlugin_1.tenantPlugin);
exports.AiSettings = (0, mongoose_1.model)('AiSettings', AiSettingsSchema);
