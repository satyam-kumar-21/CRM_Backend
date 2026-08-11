"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.Announcement = void 0;
const mongoose_1 = require("mongoose");
const tenantPlugin_1 = require("../plugins/tenantPlugin");
const AnnouncementSchema = new mongoose_1.Schema({
    title: { type: String, required: true, trim: true },
    content: { type: String, required: true },
    authorId: { type: mongoose_1.Schema.Types.ObjectId, ref: 'Employee', required: true },
    targetRoles: [{ type: String }],
    readBy: [{ type: mongoose_1.Schema.Types.ObjectId, ref: 'Employee', default: [] }],
}, { timestamps: true });
AnnouncementSchema.plugin(tenantPlugin_1.tenantPlugin);
exports.Announcement = (0, mongoose_1.model)('Announcement', AnnouncementSchema);
