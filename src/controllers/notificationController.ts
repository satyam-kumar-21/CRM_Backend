import { Response, NextFunction } from 'express';
import { AuthenticatedRequest } from '../middlewares/authMiddleware';
import { ApiResponse } from '../utils/responseHandler';
import { Notification } from '../models/Notification';

export class NotificationController {
  static async list(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const notifications = await Notification.find({
        companyId: req.user!.companyId,
        recipientId: req.user!.id,
      }).sort({ createdAt: -1 });
      ApiResponse.success(res, 'Notifications fetched successfully', notifications);
    } catch (error) {
      next(error);
    }
  }

  static async markRead(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const notification = await Notification.findOneAndUpdate(
        { companyId: req.user!.companyId, _id: req.params.id, recipientId: req.user!.id },
        { isRead: true },
        { new: true }
      );
      if (!notification) {
        res.status(404).json({ success: false, message: 'Notification not found.' });
        return;
      }
      ApiResponse.success(res, 'Notification marked as read', notification);
    } catch (error) {
      next(error);
    }
  }
}
