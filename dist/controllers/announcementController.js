"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.AnnouncementController = void 0;
const responseHandler_1 = require("../utils/responseHandler");
const Announcement_1 = require("../models/Announcement");
const Notification_1 = require("../models/Notification");
const Employee_1 = require("../models/Employee");
const index_1 = require("../constants/index");
const socket_1 = require("../realtime/socket");
class AnnouncementController {
    static async list(req, res, next) {
        try {
            const announcements = await Announcement_1.Announcement.find({
                companyId: req.user.companyId,
                $or: [{ targetRoles: { $size: 0 } }, { targetRoles: req.user.role }],
            }).sort({ createdAt: -1 });
            const payload = announcements.map((item) => ({
                _id: item._id,
                companyId: item.companyId,
                title: item.title,
                content: item.content,
                authorId: item.authorId,
                targetRoles: item.targetRoles,
                createdAt: item.createdAt,
                updatedAt: item.updatedAt,
                isRead: item.readBy.some((readerId) => readerId.toString() === req.user.id),
            }));
            responseHandler_1.ApiResponse.success(res, 'Announcements fetched successfully', payload);
        }
        catch (error) {
            next(error);
        }
    }
    static async create(req, res, next) {
        try {
            const { title, content, targetRoles = [] } = req.body;
            if (!title?.trim() || !content?.trim()) {
                res.status(400).json({ success: false, message: 'Title and content are required.' });
                return;
            }
            const announcement = await Announcement_1.Announcement.create({
                companyId: req.user.companyId,
                authorId: req.user.id,
                title: title.trim(),
                content: content.trim(),
                targetRoles,
            });
            const allowedRoles = targetRoles.length ? targetRoles : Object.values(index_1.Roles);
            const recipients = await Employee_1.Employee.find({
                companyId: req.user.companyId,
                isSuspended: false,
                role: { $in: allowedRoles },
            }).select('_id');
            const recipientIds = recipients.map((item) => item._id.toString());
            if (recipientIds.length) {
                await Notification_1.Notification.create(recipientIds.map((recipientId) => ({
                    companyId: req.user.companyId,
                    recipientId,
                    title: 'New announcement',
                    message: title.trim(),
                    link: '/company-admin/dashboard?section=announcements',
                })));
                (0, socket_1.emitUserEvent)(recipientIds, 'notification:new', {
                    title: 'New announcement',
                    message: title.trim(),
                    link: '/company-admin/dashboard?section=announcements',
                    type: 'announcement',
                });
            }
            responseHandler_1.ApiResponse.success(res, 'Announcement created successfully', announcement, 201);
        }
        catch (error) {
            next(error);
        }
    }
    static async markRead(req, res, next) {
        try {
            const announcement = await Announcement_1.Announcement.findOneAndUpdate({ companyId: req.user.companyId, _id: req.params.id }, { $addToSet: { readBy: req.user.id } }, { new: true });
            if (!announcement) {
                res.status(404).json({ success: false, message: 'Announcement not found.' });
                return;
            }
            responseHandler_1.ApiResponse.success(res, 'Announcement marked as read', { id: announcement._id, isRead: true });
        }
        catch (error) {
            next(error);
        }
    }
    static async remove(req, res, next) {
        try {
            await Announcement_1.Announcement.deleteOne({ companyId: req.user.companyId, _id: req.params.id });
            responseHandler_1.ApiResponse.success(res, 'Announcement deleted successfully', { id: req.params.id });
        }
        catch (error) {
            next(error);
        }
    }
}
exports.AnnouncementController = AnnouncementController;
