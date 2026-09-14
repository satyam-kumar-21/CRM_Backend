"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.AiKnowledgeChunk = void 0;
const mongoose_1 = require("mongoose");
const tenantPlugin_1 = require("../plugins/tenantPlugin");
const AiKnowledgeChunkSchema = new mongoose_1.Schema({
    knowledgeBaseId: { type: mongoose_1.Schema.Types.ObjectId, ref: 'AiKnowledgeBase', required: true },
    fileName: { type: String, required: true, trim: true },
    sourceType: { type: String, enum: ['uploaded'], default: 'uploaded' },
    chunkIndex: { type: Number, required: true },
    content: { type: String, required: true },
    embedding: { type: [Number], default: [] },
    metadata: { type: mongoose_1.Schema.Types.Mixed, default: {} },
}, { timestamps: true });
AiKnowledgeChunkSchema.plugin(tenantPlugin_1.tenantPlugin);
exports.AiKnowledgeChunk = (0, mongoose_1.model)('AiKnowledgeChunk', AiKnowledgeChunkSchema);
