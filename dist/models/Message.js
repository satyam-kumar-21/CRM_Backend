"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.Message = void 0;
const mongoose_1 = require("mongoose");
const tenantPlugin_1 = require("../plugins/tenantPlugin");
const MessageSchema = new mongoose_1.Schema({
    groupId: { type: mongoose_1.Schema.Types.ObjectId, ref: 'Group' },
    senderId: { type: mongoose_1.Schema.Types.ObjectId, ref: 'Employee', required: true },
    recipientId: { type: mongoose_1.Schema.Types.ObjectId, ref: 'Employee' },
    readBy: [{ type: mongoose_1.Schema.Types.ObjectId, ref: 'Employee' }],
    content: { type: String, required: true, trim: true },
    editedAt: { type: Date },
}, { timestamps: true });
MessageSchema.plugin(tenantPlugin_1.tenantPlugin);
exports.Message = (0, mongoose_1.model)('Message', MessageSchema);
