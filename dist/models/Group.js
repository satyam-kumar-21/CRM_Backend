"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.Group = void 0;
const mongoose_1 = require("mongoose");
const tenantPlugin_1 = require("../plugins/tenantPlugin");
const GroupSchema = new mongoose_1.Schema({
    name: { type: String, required: true, trim: true },
    description: { type: String, default: '' },
    privacy: { type: String, enum: ['public', 'private'], default: 'public' },
    members: [{ type: mongoose_1.Schema.Types.ObjectId, ref: 'Employee' }],
    createdBy: { type: mongoose_1.Schema.Types.ObjectId, ref: 'Employee', required: true },
}, { timestamps: true });
GroupSchema.plugin(tenantPlugin_1.tenantPlugin);
exports.Group = (0, mongoose_1.model)('Group', GroupSchema);
