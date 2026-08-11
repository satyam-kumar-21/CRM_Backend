"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.LeaveController = void 0;
const responseHandler_1 = require("../utils/responseHandler");
const Leave_1 = require("../models/Leave");
const Notification_1 = require("../models/Notification");
const Employee_1 = require("../models/Employee");
const index_1 = require("../constants/index");
const socket_1 = require("../realtime/socket");
class LeaveController {
    static async list(req, res, next) {
        try {
            const isAdmin = req.user.role === index_1.Roles.COMPANY_ADMIN;
            const query = { companyId: req.user.companyId };
            if (!isAdmin) {
                query.employeeId = req.user.id;
            }
            else {
                // Admin filters/search
                if (req.query.status) {
                    const status = String(req.query.status).toUpperCase();
                    query.status = status;
                }
                if (req.query.leaveType) {
                    query.leaveType = String(req.query.leaveType);
                }
                if (req.query.employeeId) {
                    query.employeeId = req.query.employeeId;
                }
                if (req.query.search) {
                    const search = String(req.query.search).trim();
                    if (search) {
                        // find matching employees by name or employeeId
                        const matched = await Employee_1.Employee.find({
                            companyId: req.user.companyId,
                            $or: [
                                { name: { $regex: search, $options: 'i' } },
                                { employeeId: { $regex: `^${search}`, $options: 'i' } },
                            ],
                        }).select('_id');
                        const ids = matched.map((m) => m._id);
                        query.employeeId = { $in: ids.length ? ids : ['000000000000000000000000'] };
                    }
                }
                if (req.query.from || req.query.to) {
                    const range = {};
                    if (req.query.from)
                        range.$gte = new Date(String(req.query.from));
                    if (req.query.to)
                        range.$lte = new Date(String(req.query.to));
                    if (!query.startDate)
                        query.startDate = {};
                    query.startDate = Object.assign(query.startDate, range);
                }
            }
            const records = await Leave_1.Leave.find(query).populate('employeeId', 'name employeeId role').sort({ startDate: -1 });
            // If an employee is viewing their leave list, mark leave-related notifications as read
            if (!isAdmin) {
                await Notification_1.Notification.updateMany({
                    companyId: req.user.companyId,
                    recipientId: req.user.id,
                    isRead: false,
                    $or: [
                        { link: /leave/ },
                        { title: /^Leave/ },
                    ],
                }, { $set: { isRead: true } });
            }
            responseHandler_1.ApiResponse.success(res, 'Leave records fetched successfully', records);
        }
        catch (error) {
            next(error);
        }
    }
    static async create(req, res, next) {
        try {
            const { leaveType, startDate, endDate, reason } = req.body;
            const leave = await Leave_1.Leave.create({
                companyId: req.user.companyId,
                employeeId: req.user.id,
                leaveType,
                startDate: new Date(startDate),
                endDate: new Date(endDate),
                reason: reason.trim(),
                status: index_1.LeaveStatus.PENDING,
            });
            const employee = await Employee_1.Employee.findById(req.user.id).select('name');
            const audience = await Employee_1.Employee.find({
                companyId: req.user.companyId,
                role: { $in: [index_1.Roles.COMPANY_ADMIN, index_1.Roles.HR] },
                isSuspended: false,
            }).select('_id');
            const recipientIds = audience.map((item) => item._id.toString());
            const notificationPayload = {
                title: 'Leave request submitted',
                message: `${employee?.name || 'An employee'} requested leave from ${new Date(startDate).toLocaleDateString()} to ${new Date(endDate).toLocaleDateString()}.`,
                link: '/company-admin/dashboard?section=leave',
            };
            if (recipientIds.length) {
                await Notification_1.Notification.create(recipientIds.map((recipientId) => ({
                    companyId: req.user.companyId,
                    recipientId,
                    title: 'New leave request',
                    message: `${employee?.name || 'An employee'} requested leave from ${new Date(startDate).toLocaleDateString()} to ${new Date(endDate).toLocaleDateString()}.`,
                    link: '/company-admin/dashboard?section=leave',
                })));
                (0, socket_1.emitUserEvent)(recipientIds, 'notification:new', { ...notificationPayload, type: 'leave_request' });
            }
            await Notification_1.Notification.create({
                companyId: req.user.companyId,
                recipientId: req.user.id,
                title: 'Leave request submitted',
                message: 'Your leave request has been sent for approval.',
                link: '/employee/dashboard?section=leave',
            });
            (0, socket_1.emitUserEvent)([req.user.id], 'notification:new', { ...notificationPayload, type: 'leave_submitted' });
            responseHandler_1.ApiResponse.success(res, 'Leave request created successfully', leave, 201);
        }
        catch (error) {
            next(error);
        }
    }
    static async updateStatus(req, res, next) {
        try {
            const status = req.body.status;
            if (!Object.values(index_1.LeaveStatus).includes(status)) {
                res.status(400).json({ success: false, message: 'Invalid leave status.' });
                return;
            }
            const leave = await Leave_1.Leave.findOne({ companyId: req.user.companyId, _id: req.params.id });
            if (!leave) {
                res.status(404).json({ success: false, message: 'Leave request not found.' });
                return;
            }
            const updater = await Employee_1.Employee.findById(req.user.id).select('name');
            const updaterName = updater?.name || 'Admin';
            const updateData = { status };
            if (status === index_1.LeaveStatus.APPROVED) {
                updateData.approvedBy = req.user.id;
                updateData.approvedByName = updaterName;
                updateData.rejectedBy = null;
                updateData.rejectedByName = '';
                updateData.rejectReason = '';
            }
            else if (status === index_1.LeaveStatus.REJECTED) {
                const rejectReason = String(req.body.rejectReason || '').trim();
                if (!rejectReason) {
                    res.status(400).json({ success: false, message: 'Reject reason is required when rejecting leave.' });
                    return;
                }
                updateData.rejectedBy = req.user.id;
                updateData.rejectedByName = updaterName;
                updateData.rejectReason = rejectReason;
                updateData.approvedBy = null;
                updateData.approvedByName = '';
            }
            const updatedLeave = await Leave_1.Leave.findOneAndUpdate({ companyId: req.user.companyId, _id: req.params.id }, updateData, { new: true });
            if (!updatedLeave) {
                res.status(404).json({ success: false, message: 'Leave request not found.' });
                return;
            }
            const message = status === index_1.LeaveStatus.APPROVED
                ? `Your leave request has been approved by ${updaterName}.`
                : `Your leave request was rejected by ${updaterName}. Reason: ${updateData.rejectReason}`;
            await Notification_1.Notification.create({
                companyId: req.user.companyId,
                recipientId: updatedLeave.employeeId,
                title: status === index_1.LeaveStatus.APPROVED ? 'Leave approved' : 'Leave rejected',
                message,
                link: '/employee/dashboard?section=leave',
            });
            (0, socket_1.emitUserEvent)([updatedLeave.employeeId.toString()], 'notification:new', {
                title: status === index_1.LeaveStatus.APPROVED ? 'Leave approved' : 'Leave rejected',
                message,
                type: 'leave_update',
            });
            responseHandler_1.ApiResponse.success(res, 'Leave status updated successfully', updatedLeave);
        }
        catch (error) {
            next(error);
        }
    }
}
exports.LeaveController = LeaveController;
