"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.AnnouncementController = void 0;
const responseHandler_1 = require("../utils/responseHandler");
const Announcement_1 = require("../models/Announcement");
class AnnouncementController {
    static async list(req, res, next) {
        try {
            responseHandler_1.ApiResponse.success(res, 'Announcements fetched successfully', await Announcement_1.Announcement.find({ companyId: req.user.companyId, $or: [{ targetRoles: { $size: 0 } }, { targetRoles: req.user.role }] }).sort({ createdAt: -1 }));
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
            responseHandler_1.ApiResponse.success(res, 'Announcement created successfully', await Announcement_1.Announcement.create({ companyId: req.user.companyId, authorId: req.user.id, title: title.trim(), content: content.trim(), targetRoles }), 201);
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
