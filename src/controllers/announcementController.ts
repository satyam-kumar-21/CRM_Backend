import { Response, NextFunction } from 'express';
import { AuthenticatedRequest } from '../middlewares/authMiddleware';
import { ApiResponse } from '../utils/responseHandler';
import { Announcement } from '../models/Announcement';
import { Notification } from '../models/Notification';
import { Employee } from '../models/Employee';
import { Roles } from '../constants/index';
import { emitUserEvent } from '../realtime/socket';

export class AnnouncementController {
  static async list(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const announcements = await Announcement.find({
        companyId: req.user!.companyId,
        $or: [{ targetRoles: { $size: 0 } }, { targetRoles: req.user!.role }],
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
        isRead: item.readBy.some((readerId) => readerId.toString() === req.user!.id),
      }));

      ApiResponse.success(res, 'Announcements fetched successfully', payload);
    } catch (error) {
      next(error);
    }
  }

  static async create(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const { title, content, targetRoles = [] } = req.body;
      if (!title?.trim() || !content?.trim()) {
        res.status(400).json({ success: false, message: 'Title and content are required.' });
        return;
      }

      const announcement = await Announcement.create({
        companyId: req.user!.companyId,
        authorId: req.user!.id,
        title: title.trim(),
        content: content.trim(),
        targetRoles,
      });

      const allowedRoles = targetRoles.length ? targetRoles : Object.values(Roles);
      const recipients = await Employee.find({
        companyId: req.user!.companyId,
        isSuspended: false,
        role: { $in: allowedRoles },
      }).select('_id');
      const recipientIds = recipients.map((item) => item._id.toString());

      if (recipientIds.length) {
        await Notification.create(
          recipientIds.map((recipientId) => ({
            companyId: req.user!.companyId,
            recipientId,
            title: 'New announcement',
            message: title.trim(),
            link: '/company-admin/dashboard?section=announcements',
          }))
        );

        emitUserEvent(recipientIds, 'notification:new', {
          title: 'New announcement',
          message: title.trim(),
          link: '/company-admin/dashboard?section=announcements',
          type: 'announcement',
        });
      }

      ApiResponse.success(res, 'Announcement created successfully', announcement, 201);
    } catch (error) {
      next(error);
    }
  }

  static async markRead(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const announcement = await Announcement.findOneAndUpdate(
        { companyId: req.user!.companyId, _id: req.params.id },
        { $addToSet: { readBy: req.user!.id } },
        { new: true }
      );

      if (!announcement) {
        res.status(404).json({ success: false, message: 'Announcement not found.' });
        return;
      }

      ApiResponse.success(res, 'Announcement marked as read', { id: announcement._id, isRead: true });
    } catch (error) {
      next(error);
    }
  }

  static async remove(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      await Announcement.deleteOne({ companyId: req.user!.companyId, _id: req.params.id });
      ApiResponse.success(res, 'Announcement deleted successfully', { id: req.params.id });
    } catch (error) {
      next(error);
    }
  }
}
