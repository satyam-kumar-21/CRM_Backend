import { Response, NextFunction } from 'express';
import { AuthenticatedRequest } from '../middlewares/authMiddleware';
import { ApiResponse } from '../utils/responseHandler';
import { Announcement } from '../models/Announcement';
import { Roles } from '../constants/index';

export class AnnouncementController {
  static async list(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try { ApiResponse.success(res, 'Announcements fetched successfully', await Announcement.find({ companyId: req.user!.companyId, $or: [{ targetRoles: { $size: 0 } }, { targetRoles: req.user!.role }] }).sort({ createdAt: -1 })); } catch (error) { next(error); }
  }
  static async create(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try { const { title, content, targetRoles = [] } = req.body; if (!title?.trim() || !content?.trim()) { res.status(400).json({ success: false, message: 'Title and content are required.' }); return; } ApiResponse.success(res, 'Announcement created successfully', await Announcement.create({ companyId: req.user!.companyId, authorId: req.user!.id, title: title.trim(), content: content.trim(), targetRoles }), 201); } catch (error) { next(error); }
  }
  static async remove(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try { await Announcement.deleteOne({ companyId: req.user!.companyId, _id: req.params.id }); ApiResponse.success(res, 'Announcement deleted successfully', { id: req.params.id }); } catch (error) { next(error); }
  }
}
