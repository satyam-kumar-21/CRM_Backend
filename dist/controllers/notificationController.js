"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.NotificationController = void 0;
const responseHandler_1 = require("../utils/responseHandler");
const Notification_1 = require("../models/Notification");
class NotificationController {
    static async list(req, res, next) {
        try {
            const notifications = await Notification_1.Notification.find({
                companyId: req.user.companyId,
                recipientId: req.user.id,
            }).sort({ createdAt: -1 });
            responseHandler_1.ApiResponse.success(res, 'Notifications fetched successfully', notifications);
        }
        catch (error) {
            next(error);
        }
    }
    static async markRead(req, res, next) {
        try {
            const notification = await Notification_1.Notification.findOneAndUpdate({ companyId: req.user.companyId, _id: req.params.id, recipientId: req.user.id }, { isRead: true }, { new: true });
            if (!notification) {
                res.status(404).json({ success: false, message: 'Notification not found.' });
                return;
            }
            responseHandler_1.ApiResponse.success(res, 'Notification marked as read', notification);
        }
        catch (error) {
            next(error);
        }
    }
}
exports.NotificationController = NotificationController;
