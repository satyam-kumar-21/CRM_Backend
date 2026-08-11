import { Response, NextFunction } from 'express';
import { AuthenticatedRequest } from '../middlewares/authMiddleware';
import { ApiResponse } from '../utils/responseHandler';
import { Leave } from '../models/Leave';
import { Notification } from '../models/Notification';
import { Employee } from '../models/Employee';
import { LeaveStatus, Roles } from '../constants/index';
import { getBusinessMonthRange } from '../utils/businessDate';
import { emitUserEvent } from '../realtime/socket';

export class LeaveController {
  static async list(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const isAdmin = req.user!.role === Roles.COMPANY_ADMIN;
      const query: Record<string, unknown> = { companyId: req.user!.companyId };
      if (!isAdmin) query.employeeId = req.user!.id;
      if (req.query.month) {
        const month = String(req.query.month);
        const range = getBusinessMonthRange(month);
        query.startDate = { $gte: range.start, $lt: range.end };
      }
      const records = await Leave.find(query).populate('employeeId', 'name employeeId role').sort({ startDate: -1 });
      ApiResponse.success(res, 'Leave records fetched successfully', records);
    } catch (error) { next(error); }
  }

  static async create(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const { leaveType, startDate, endDate, reason } = req.body;
      const leave = await Leave.create({
        companyId: req.user!.companyId,
        employeeId: req.user!.id,
        leaveType,
        startDate: new Date(startDate),
        endDate: new Date(endDate),
        reason: reason.trim(),
        status: LeaveStatus.PENDING,
      });

      const employee = await Employee.findById(req.user!.id).select('name');
      const audience = await Employee.find({
        companyId: req.user!.companyId,
        role: { $in: [Roles.COMPANY_ADMIN, Roles.HR] },
        isSuspended: false,
      }).select('_id');
      const recipientIds = audience.map((item) => item._id.toString());

      const notificationPayload = {
        title: 'Leave request submitted',
        message: `${employee?.name || 'An employee'} requested leave from ${new Date(startDate).toLocaleDateString()} to ${new Date(endDate).toLocaleDateString()}.`,
        link: '/company-admin/dashboard?section=leave',
      };

      if (recipientIds.length) {
        await Notification.create(
          recipientIds.map((recipientId) => ({
            companyId: req.user!.companyId,
            recipientId,
            title: 'New leave request',
            message: `${employee?.name || 'An employee'} requested leave from ${new Date(startDate).toLocaleDateString()} to ${new Date(endDate).toLocaleDateString()}.`,
            link: '/company-admin/dashboard?section=leave',
          }))
        );
        emitUserEvent(recipientIds, 'notification:new', { ...notificationPayload, type: 'leave_request' });
      }

      await Notification.create({
        companyId: req.user!.companyId,
        recipientId: req.user!.id,
        title: 'Leave request submitted',
        message: 'Your leave request has been sent for approval.',
        link: '/employee/dashboard?section=leave',
      });
      emitUserEvent([req.user!.id], 'notification:new', { ...notificationPayload, type: 'leave_submitted' });

      ApiResponse.success(res, 'Leave request created successfully', leave, 201);
    } catch (error) {
      next(error);
    }
  }

  static async updateStatus(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const status = req.body.status as LeaveStatus;
      if (!Object.values(LeaveStatus).includes(status)) {
        res.status(400).json({ success: false, message: 'Invalid leave status.' });
        return;
      }

      const leave = await Leave.findOne({ companyId: req.user!.companyId, _id: req.params.id });
      if (!leave) {
        res.status(404).json({ success: false, message: 'Leave request not found.' });
        return;
      }

      const updater = await Employee.findById(req.user!.id).select('name');
      const updaterName = updater?.name || 'Admin';
      const updateData: any = { status };
      if (status === LeaveStatus.APPROVED) {
        updateData.approvedBy = req.user!.id;
        updateData.approvedByName = updaterName;
        updateData.rejectedBy = null;
        updateData.rejectedByName = '';
        updateData.rejectReason = '';
      } else if (status === LeaveStatus.REJECTED) {
        const rejectReason = String(req.body.rejectReason || '').trim();
        if (!rejectReason) {
          res.status(400).json({ success: false, message: 'Reject reason is required when rejecting leave.' });
          return;
        }
        updateData.rejectedBy = req.user!.id;
        updateData.rejectedByName = updaterName;
        updateData.rejectReason = rejectReason;
        updateData.approvedBy = null;
        updateData.approvedByName = '';
      }

      const updatedLeave = await Leave.findOneAndUpdate({ companyId: req.user!.companyId, _id: req.params.id }, updateData, { new: true });
      if (!updatedLeave) {
        res.status(404).json({ success: false, message: 'Leave request not found.' });
        return;
      }

      const message =
        status === LeaveStatus.APPROVED
          ? `Your leave request has been approved by ${updaterName}.`
          : `Your leave request was rejected by ${updaterName}. Reason: ${updateData.rejectReason}`;
      await Notification.create({
        companyId: req.user!.companyId,
        recipientId: updatedLeave.employeeId,
        title: status === LeaveStatus.APPROVED ? 'Leave approved' : 'Leave rejected',
        message,
        link: '/employee/dashboard?section=leave',
      });
      emitUserEvent([updatedLeave.employeeId.toString()], 'notification:new', {
        title: status === LeaveStatus.APPROVED ? 'Leave approved' : 'Leave rejected',
        message,
        type: 'leave_update',
      });

      ApiResponse.success(res, 'Leave status updated successfully', updatedLeave);
    } catch (error) {
      next(error);
    }
  }
}
