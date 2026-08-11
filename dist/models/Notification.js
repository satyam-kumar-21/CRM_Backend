"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.Notification = void 0;
const mongoose_1 = require("mongoose");
const tenantPlugin_1 = require("../plugins/tenantPlugin");
const NotificationSchema = new mongoose_1.Schema({
    recipientId: { type: mongoose_1.Schema.Types.ObjectId, ref: 'Employee', required: true },
    title: { type: String, required: true },
    message: { type: String, required: true },
    isRead: { type: Boolean, default: false },
    link: { type: String, default: '' },
}, { timestamps: true });
NotificationSchema.plugin(tenantPlugin_1.tenantPlugin);
exports.Notification = (0, mongoose_1.model)('Notification', NotificationSchema);
