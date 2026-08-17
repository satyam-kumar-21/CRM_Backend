"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.CompanyAuthService = void 0;
const bcrypt_1 = __importDefault(require("bcrypt"));
const mongoose_1 = require("mongoose");
const Employee_1 = require("../models/Employee");
const Company_1 = require("../models/Company");
const index_1 = require("../constants/index");
const jwt_1 = require("../utils/jwt");
const Group_1 = require("../models/Group");
const Message_1 = require("../models/Message");
const Lead_1 = require("../models/Lead");
const Sale_1 = require("../models/Sale");
const Attendance_1 = require("../models/Attendance");
const Leave_1 = require("../models/Leave");
const Announcement_1 = require("../models/Announcement");
const Notification_1 = require("../models/Notification");
const remoteSupportService_1 = require("./remoteSupportService");
const RemoteSupport_1 = require("../models/RemoteSupport");
const projectService_1 = require("./projectService");
const index_2 = require("../constants/index");
const businessDate_1 = require("../utils/businessDate");
const otpService_1 = require("./otpService");
const messageWithSender = (message, userId) => {
    const sender = (message.senderId || null);
    const senderId = sender?._id ? String(sender._id) : null;
    return {
        ...message.toObject(),
        senderName: sender?.name || 'Workspace member',
        isMine: senderId === userId,
        isSeen: message.readBy?.some((readerId) => readerId.toString() !== userId) || false,
        isEdited: Boolean(message.editedAt),
    };
};
class CompanyAuthService {
    static async canAccessConversation(companyId, userId, role, conversationId) {
        if (!mongoose_1.Types.ObjectId.isValid(conversationId))
            return false;
        const group = await Group_1.Group.findOne({ _id: conversationId, companyId });
        if (group)
            return role === index_1.Roles.COMPANY_ADMIN || group.privacy === 'public' || group.createdBy.toString() === userId || group.members.some((memberId) => memberId.toString() === userId);
        const employee = await Employee_1.Employee.findOne({ companyId, _id: conversationId, isSuspended: false });
        return Boolean(employee);
    }
    static async getRealtimeMessage(companyId, userId, messageId) {
        const message = await Message_1.Message.findOne({ companyId, _id: messageId }).populate('senderId', 'name');
        return message ? messageWithSender(message, userId) : null;
    }
    static async markConversationRead(companyId, userId, role, conversationId) {
        const allowed = await this.canAccessConversation(companyId, userId, role, conversationId);
        if (!allowed)
            return { senderIds: [], messageIds: [] };
        const isGroup = Boolean(await Group_1.Group.exists({ _id: conversationId, companyId }));
        const filter = isGroup
            ? { companyId, groupId: conversationId, senderId: { $ne: userId } }
            : { companyId, recipientId: userId, senderId: conversationId };
        const unread = await Message_1.Message.find({ ...filter, readBy: { $ne: userId } }).select('_id senderId');
        if (!unread.length)
            return { senderIds: [], messageIds: [] };
        await Message_1.Message.updateMany({ _id: { $in: unread.map((message) => message._id) } }, { $addToSet: { readBy: userId } });
        return {
            senderIds: Array.from(new Set(unread.map((message) => message.senderId.toString()))),
            messageIds: unread.map((message) => message._id.toString()),
        };
    }
    static async getConversationAudience(companyId, conversationId) {
        if (!mongoose_1.Types.ObjectId.isValid(conversationId))
            return [];
        const group = await Group_1.Group.findOne({ _id: conversationId, companyId });
        if (group) {
            if (group.privacy === 'private')
                return Array.from(new Set([group.createdBy.toString(), ...group.members.map((id) => id.toString())]));
            const employees = await Employee_1.Employee.find({ companyId, isSuspended: false }).select('_id');
            return employees.map((employee) => employee._id.toString());
        }
        const employee = await Employee_1.Employee.findOne({ companyId, _id: conversationId, isSuspended: false }).select('_id');
        return employee ? [employee._id.toString()] : [];
    }
    static isOtpRequired(employee, company) {
        if (employee.role === index_1.Roles.COMPANY_ADMIN)
            return true;
        return company.settings?.employeeOtpEnabled === true;
    }
    static async completeLogin(employee, company) {
        const payload = {
            id: employee._id.toString(),
            role: employee.role,
            companyId: company._id.toString(),
            portalType: employee.role === index_1.Roles.COMPANY_ADMIN ? 'COMPANY_ADMIN' : 'EMPLOYEE',
        };
        const accessToken = (0, jwt_1.generateAccessToken)(payload);
        const refreshToken = (0, jwt_1.generateRefreshToken)(payload);
        employee.refreshTokens.push(refreshToken);
        await employee.save();
        const dayStart = (0, businessDate_1.getBusinessDayStart)();
        const dayEnd = (0, businessDate_1.getBusinessDayEnd)();
        await Attendance_1.Attendance.findOneAndUpdate({ companyId: company._id, employeeId: employee._id, date: { $gte: dayStart, $lt: dayEnd } }, { $setOnInsert: { date: dayStart, checkIn: new Date(), status: index_2.AttendanceStatus.PRESENT, workHours: 0 } }, { upsert: true, new: true });
        return {
            employee: {
                id: employee._id,
                employeeId: employee.employeeId,
                name: employee.name,
                role: employee.role,
            },
            company: {
                id: company._id,
                name: company.name,
            },
            accessToken,
            refreshToken,
        };
    }
    static async authenticateCredentials(identifier, password) {
        const company = await Company_1.Company.findOne({ status: index_1.CompanyStatus.ACTIVE });
        if (!company) {
            throw { statusCode: 401, message: 'Company not configured.' };
        }
        let employee = null;
        if (identifier.includes('@')) {
            employee = await Employee_1.Employee.findOne({ companyId: company._id, email: identifier.toLowerCase() });
        }
        else {
            employee = await Employee_1.Employee.findOne({ companyId: company._id, employeeId: identifier.trim() });
        }
        if (!employee || employee.isSuspended) {
            throw { statusCode: 401, message: 'Invalid employee credentials or account suspended.' };
        }
        if (company.settings && company.settings.employeeLoginEnabled === false && employee.role !== index_1.Roles.COMPANY_ADMIN) {
            throw { statusCode: 403, message: 'Employee login is currently disabled by Admin.' };
        }
        const isMatch = await bcrypt_1.default.compare(password, employee.passwordHash);
        if (!isMatch) {
            throw { statusCode: 401, message: 'Invalid employee credentials.' };
        }
        return { employee, company };
    }
    static async login(identifier, password) {
        const { employee, company } = await this.authenticateCredentials(identifier, password);
        if (this.isOtpRequired(employee, company)) {
            const email = employee.email?.toLowerCase();
            if (!email) {
                throw { statusCode: 400, message: 'No email on file for OTP verification. Contact your admin to add your email.' };
            }
            const otpSession = await otpService_1.OtpService.createAndSendLoginOtp(employee._id.toString(), company._id.toString(), email, employee.name);
            return {
                otpRequired: true,
                otpToken: otpSession.otpToken,
                maskedEmail: otpSession.maskedEmail,
                role: employee.role,
            };
        }
        const result = await this.completeLogin(employee, company);
        return { otpRequired: false, ...result };
    }
    static async verifyLoginOtp(otpToken, otp) {
        const { employeeId, companyId } = await otpService_1.OtpService.verifyLoginOtp(otpToken, otp);
        const [employee, company] = await Promise.all([
            Employee_1.Employee.findOne({ _id: employeeId, companyId }),
            Company_1.Company.findById(companyId),
        ]);
        if (!employee || employee.isSuspended || !company || company.status !== index_1.CompanyStatus.ACTIVE) {
            throw { statusCode: 401, message: 'Login session invalid. Please login again.' };
        }
        return this.completeLogin(employee, company);
    }
    static async recordLogout(employeeId, companyId) {
        const dayStart = (0, businessDate_1.getBusinessDayStart)();
        const dayEnd = (0, businessDate_1.getBusinessDayEnd)();
        const attendance = await Attendance_1.Attendance.findOne({ companyId, employeeId, date: { $gte: dayStart, $lt: dayEnd } });
        if (!attendance || !attendance.checkIn)
            return;
        const checkOut = new Date();
        attendance.checkOut = checkOut;
        attendance.workHours = Math.max(0, (checkOut.getTime() - attendance.checkIn.getTime()) / 3600000);
        await attendance.save();
    }
    static async getCurrentEmployeeProfile(companyId, employeeId) {
        return Employee_1.Employee.findOne({ companyId, _id: employeeId }).select('theme name role employeeId email phone createdAt');
    }
    static async updateEmployeeTheme(companyId, employeeId, theme) {
        const allowedThemes = ['blue', 'green', 'pink', 'purple', 'orange'];
        const nextTheme = allowedThemes.includes(theme) ? theme : 'blue';
        const employee = await Employee_1.Employee.findOneAndUpdate({ companyId, _id: employeeId }, { $set: { theme: nextTheme } }, { new: true });
        if (!employee) {
            throw { statusCode: 404, message: 'Employee not found.' };
        }
        return { theme: employee.theme || 'blue' };
    }
    static async getDashboard(employeeId, companyId, role) {
        let actualCompanyId = companyId;
        let employee = await Employee_1.Employee.findOne({ companyId, _id: employeeId });
        if (!employee) {
            employee = await Employee_1.Employee.findById(employeeId);
            if (!employee) {
                throw { statusCode: 401, message: 'Your session is invalid or expired. Please log in again.' };
            }
            actualCompanyId = employee.companyId.toString();
        }
        else {
            actualCompanyId = employee.companyId.toString();
        }
        const company = await Company_1.Company.findById(actualCompanyId);
        if (!company) {
            throw { statusCode: 401, message: 'Your company session is no longer available. Please log in again.' };
        }
        const employeeCount = await Employee_1.Employee.countDocuments({ companyId: actualCompanyId });
        const isAdmin = role === index_1.Roles.COMPANY_ADMIN;
        const pendingLeaveCount = isAdmin
            ? await Leave_1.Leave.countDocuments({ companyId, status: index_2.LeaveStatus.PENDING })
            : await Leave_1.Leave.countDocuments({ companyId, employeeId });
        const unreadAnnouncementCount = await Announcement_1.Announcement.countDocuments({
            companyId: actualCompanyId,
            $or: [{ targetRoles: { $size: 0 } }, { targetRoles: role }],
            readBy: { $ne: employee._id },
        });
        const unreadNotificationCount = await Notification_1.Notification.countDocuments({
            companyId: actualCompanyId,
            recipientId: employee._id,
            isRead: false,
        });
        const nonFailedSaleFilter = {
            failed: { $ne: true },
            $or: [{ saleStatus: 'CHARGED' }, { saleStatus: { $exists: false } }, { saleStatus: null }],
        };
        const currentMonth = (0, businessDate_1.getBusinessMonthString)();
        const { start: monthStart, end: monthEnd } = (0, businessDate_1.getBusinessMonthRange)(currentMonth);
        const companyTotalLeads = await Lead_1.Lead.countDocuments({ companyId: actualCompanyId });
        const companyConnectedLeads = await Lead_1.Lead.countDocuments({ companyId: actualCompanyId, connected: 'yes' });
        const companyPendingLeads = await Lead_1.Lead.countDocuments({ companyId: actualCompanyId, connected: 'no' });
        const companyTotalSales = await Sale_1.Sale.countDocuments({ companyId: actualCompanyId, ...nonFailedSaleFilter, createdAt: { $gte: monthStart, $lt: monthEnd } });
        const companyFailedSales = await Sale_1.Sale.countDocuments({ companyId: actualCompanyId, failed: true, createdAt: { $gte: monthStart, $lt: monthEnd } });
        const companyRevenueResult = await Sale_1.Sale.aggregate([
            { $match: { companyId: new mongoose_1.Types.ObjectId(actualCompanyId), ...nonFailedSaleFilter, createdAt: { $gte: monthStart, $lt: monthEnd } } },
            { $group: { _id: null, total: { $sum: { $ifNull: ['$finalAmount', '$amount'] } } } },
        ]);
        const companyRevenue = companyRevenueResult[0]?.total || 0;
        const employeeLeadFilter = {
            companyId: actualCompanyId,
            $or: [{ connectedBy: employee.name }, { connectedBy: employee.employeeId }],
        };
        const employeeLeads = await Lead_1.Lead.countDocuments(employeeLeadFilter);
        const employeeConnectedLeads = await Lead_1.Lead.countDocuments({ ...employeeLeadFilter, connected: 'yes' });
        const employeePendingLeads = await Lead_1.Lead.countDocuments({ ...employeeLeadFilter, connected: 'no' });
        const employeeSalesFilter = { companyId: actualCompanyId, ...nonFailedSaleFilter, $or: [{ connectedBy: employee.name }, { connectedBy: employee.employeeId }] };
        const employeeSales = await Sale_1.Sale.countDocuments(employeeSalesFilter);
        const employeeFailedSales = await Sale_1.Sale.countDocuments({ companyId: actualCompanyId, failed: true, $or: [{ connectedBy: employee.name }, { connectedBy: employee.employeeId }] });
        const employeeRevenueResult = await Sale_1.Sale.aggregate([
            { $match: { companyId: new mongoose_1.Types.ObjectId(actualCompanyId), ...nonFailedSaleFilter, $or: [{ connectedBy: employee.name }, { connectedBy: employee.employeeId }] } },
            { $group: { _id: null, total: { $sum: { $ifNull: ['$finalAmount', '$amount'] } } } },
        ]);
        const employeeRevenue = employeeRevenueResult[0]?.total || 0;
        const monthlySalesResult = await Sale_1.Sale.aggregate([
            {
                $match: {
                    companyId: new mongoose_1.Types.ObjectId(actualCompanyId),
                    ...nonFailedSaleFilter,
                    createdAt: { $gte: monthStart, $lt: monthEnd },
                    $or: [
                        { salesEmployeeId: employee._id },
                        { salesEmployeeName: employee.name },
                        { connectedBy: employee.name },
                        { connectedBy: employee.employeeId },
                    ],
                },
            },
            { $group: { _id: null, total: { $sum: { $ifNull: ['$finalAmount', '$amount'] } } } },
        ]);
        const monthlySalesAchieved = monthlySalesResult[0]?.total || 0;
        const groups = await Group_1.Group.find(isAdmin ? { companyId: actualCompanyId } : {
            companyId: actualCompanyId,
            $or: [
                { privacy: 'public' },
                { privacy: 'private', members: employee._id },
            ],
        });
        const chatEmployees = isAdmin ? [] : await Promise.all((await Employee_1.Employee.find({ companyId: actualCompanyId, isSuspended: false, _id: { $ne: employeeId } }).select('_id employeeId name role email')).map(async (chatEmployee) => {
            const [latestMessage, unreadCount] = await Promise.all([
                Message_1.Message.findOne({ companyId: actualCompanyId, $or: [{ senderId: chatEmployee._id, recipientId: employeeId }, { senderId: employeeId, recipientId: chatEmployee._id }] }).sort({ createdAt: -1 }).select('createdAt'),
                Message_1.Message.countDocuments({ companyId: actualCompanyId, senderId: chatEmployee._id, recipientId: employeeId, readBy: { $ne: employeeId } }),
            ]);
            return { ...chatEmployee.toObject(), latestChatAt: latestMessage?.createdAt || null, unreadCount };
        }));
        const visibleGroupIds = groups.map((group) => group._id);
        const messages = await Message_1.Message.find(isAdmin ? { companyId: actualCompanyId } : {
            companyId: actualCompanyId,
            $or: [
                { groupId: { $in: visibleGroupIds } },
                { senderId: employee._id },
                { recipientId: employee._id },
            ],
        }).populate('senderId', 'name').sort({ createdAt: -1 }).limit(10);
        const recentMessages = messages.map((message) => messageWithSender(message, employeeId));
        const groupMetadata = await Promise.all(groups.map(async (group) => {
            const [latestMessage, unreadCount] = await Promise.all([
                Message_1.Message.findOne({ companyId: actualCompanyId, groupId: group._id }).sort({ createdAt: -1 }).select('createdAt'),
                Message_1.Message.countDocuments({ companyId: actualCompanyId, groupId: group._id, senderId: { $ne: employeeId }, readBy: { $ne: employeeId } }),
            ]);
            return { id: group._id.toString(), latestChatAt: latestMessage?.createdAt || null, unreadCount };
        }));
        const remoteSupportSummary = await remoteSupportService_1.RemoteSupportService.summarize(actualCompanyId, role, employeeId);
        const projectSummary = await projectService_1.ProjectService.summary(actualCompanyId, role, employeeId);
        // Today's business-day metrics
        const todayStart = (0, businessDate_1.getBusinessDayStart)();
        const todayEnd = (0, businessDate_1.getBusinessDayEnd)();
        const todayLeads = await Lead_1.Lead.countDocuments({ companyId: actualCompanyId, createdAt: { $gte: todayStart, $lt: todayEnd } });
        const todaySalesCount = await Sale_1.Sale.countDocuments({ companyId: actualCompanyId, ...nonFailedSaleFilter, createdAt: { $gte: todayStart, $lt: todayEnd } });
        const todaySalesAgg = await Sale_1.Sale.aggregate([
            { $match: { companyId: new mongoose_1.Types.ObjectId(actualCompanyId), ...nonFailedSaleFilter, createdAt: { $gte: todayStart, $lt: todayEnd } } },
            { $group: { _id: null, total: { $sum: { $ifNull: ['$finalAmount', '$amount'] } } } },
        ]);
        const todaySalesAmount = todaySalesAgg[0]?.total || 0;
        const todayFailedSales = await Sale_1.Sale.countDocuments({ companyId: actualCompanyId, failed: true, createdAt: { $gte: todayStart, $lt: todayEnd } });
        const todayRemoteSuccessful = await RemoteSupport_1.RemoteSupport.countDocuments({ companyId: actualCompanyId, status: 'SUCCESSFUL', dateTime: { $gte: todayStart, $lt: todayEnd } });
        const todayRemoteFailed = await RemoteSupport_1.RemoteSupport.countDocuments({ companyId: actualCompanyId, status: 'FAILED', dateTime: { $gte: todayStart, $lt: todayEnd } });
        const todayRemoteTotal = todayRemoteSuccessful + todayRemoteFailed;
        const topSalesEmployees = await Sale_1.Sale.aggregate([
            {
                $match: {
                    companyId: new mongoose_1.Types.ObjectId(actualCompanyId),
                    ...nonFailedSaleFilter,
                    createdAt: { $gte: monthStart, $lt: monthEnd },
                },
            },
            {
                $group: {
                    _id: { $ifNull: ['$salesEmployeeName', '$connectedBy'] },
                    totalAmount: { $sum: { $ifNull: ['$finalAmount', '$amount'] } },
                    saleCount: { $sum: 1 },
                },
            },
            { $sort: { totalAmount: -1 } },
            { $limit: 3 },
        ]).exec();
        const topTechSupportEmployees = await RemoteSupport_1.RemoteSupport.aggregate([
            {
                $match: {
                    companyId: new mongoose_1.Types.ObjectId(companyId),
                    techSupportEmployeeName: { $nin: ['', null] },
                    dateTime: { $gte: monthStart, $lt: monthEnd },
                },
            },
            {
                $group: {
                    _id: '$techSupportEmployeeName',
                    remoteCount: { $sum: 1 },
                },
            },
            { $sort: { remoteCount: -1 } },
            { $limit: 2 },
        ]).exec();
        // Lists for tabular report (limited)
        const todaysLeadsList = await Lead_1.Lead.find({ companyId: actualCompanyId, createdAt: { $gte: todayStart, $lt: todayEnd } }).sort({ createdAt: -1 }).limit(500);
        const todaysSalesList = await Sale_1.Sale.find({ companyId: actualCompanyId, ...nonFailedSaleFilter, createdAt: { $gte: todayStart, $lt: todayEnd } }).sort({ createdAt: -1 }).limit(500);
        const todaysFailedSalesList = await Sale_1.Sale.find({ companyId: actualCompanyId, failed: true, createdAt: { $gte: todayStart, $lt: todayEnd } }).sort({ createdAt: -1 }).limit(500);
        const todaysRemoteList = await remoteSupportService_1.RemoteSupportService.list(actualCompanyId, role, employeeId, { fromDate: todayStart.toISOString(), toDate: todayEnd.toISOString() });
        // Verification metrics for today's business day
        const todayVerificationsPending = await Sale_1.Sale.countDocuments({ companyId: actualCompanyId, verificationStatus: 'PENDING', createdAt: { $gte: todayStart, $lt: todayEnd } });
        const todayVerificationsSuccessful = await Sale_1.Sale.countDocuments({ companyId: actualCompanyId, verificationStatus: 'SUCCESSFUL', createdAt: { $gte: todayStart, $lt: todayEnd } });
        const todayVerificationsFailed = await Sale_1.Sale.countDocuments({ companyId: actualCompanyId, verificationStatus: 'FAILED', createdAt: { $gte: todayStart, $lt: todayEnd } });
        const todayVerificationsTotal = todayVerificationsPending + todayVerificationsSuccessful + todayVerificationsFailed;
        const todaysVerificationsList = await Sale_1.Sale.find({ companyId: actualCompanyId, createdAt: { $gte: todayStart, $lt: todayEnd } }).sort({ createdAt: -1 }).limit(500);
        return {
            company: {
                id: company?._id,
                name: company?.name,
                status: company?.status,
                plan: company?.plan,
            },
            employee: {
                _id: employee._id,
                employeeId: employee.employeeId,
                name: employee.name,
                email: employee.email || '',
                role: employee.role,
                theme: employee.theme || 'blue',
                monthlySalesTarget: employee.monthlySalesTarget || 0,
                remoteTarget: employee.remoteTarget || 0,
                monthlySalesAchieved: monthlySalesAchieved || 0,
                leadsAssigned: employee.leadsAssigned || 0,
                leadsConverted: employee.leadsConverted || 0,
                phone: employee.phone,
                createdAt: employee.createdAt,
            },
            stats: {
                totalEmployees: employeeCount,
                activeGroups: groups.length,
                recentMessages: recentMessages.length,
                totalLeads: companyTotalLeads,
                totalSales: companyTotalSales,
                totalRevenue: companyRevenue,
                failedSales: companyFailedSales,
                connectedLeads: companyConnectedLeads,
                pendingLeads: companyPendingLeads,
                myLeads: employeeLeads,
                mySales: employeeSales,
                myRevenue: employeeRevenue,
                myFailedSales: employeeFailedSales,
                myConnectedLeads: employeeConnectedLeads,
                myPendingLeads: employeePendingLeads,
                monthlySalesAchieved,
                remoteSupportTickets: remoteSupportSummary.total,
                activeProjects: projectSummary.active,
                completedProjects: projectSummary.completed,
                pendingProjects: projectSummary.pending,
                topSalesEmployees: topSalesEmployees.map((item) => ({ name: item._id, totalAmount: item.totalAmount, saleCount: item.saleCount })),
                topTechSupportEmployees: topTechSupportEmployees.map((item) => ({ name: item._id, remoteCount: item.remoteCount })),
                // today's report values (business day)
                todayReport: {
                    businessDate: { start: todayStart.toISOString(), end: todayEnd.toISOString() },
                    leads: todayLeads,
                    salesCount: todaySalesCount,
                    salesAmount: todaySalesAmount,
                    failedSales: todayFailedSales,
                    verifications: {
                        pending: todayVerificationsPending,
                        successful: todayVerificationsSuccessful,
                        failed: todayVerificationsFailed,
                        total: todayVerificationsTotal,
                    },
                    remote: {
                        successful: todayRemoteSuccessful,
                        failed: todayRemoteFailed,
                        total: todayRemoteTotal,
                    },
                    lists: {
                        leads: todaysLeadsList.map((l) => ({ _id: l._id, name: l.name, country: l.country, system: l.system, createdAt: l.createdAt })),
                        sales: todaysSalesList.map((s) => ({ _id: s._id, name: s.name, amount: s.amount, connectedBy: s.connectedBy, saleDate: s.saleDate, failed: s.failed })),
                        failed: todaysFailedSalesList.map((s) => ({ _id: s._id, name: s.name, amount: s.amount, connectedBy: s.connectedBy, saleDate: s.saleDate, failed: s.failed })),
                        remote: todaysRemoteList.map((r) => ({ _id: r._id, customerName: r.customerName, salesEmployeeName: r.salesEmployeeName, techSupportEmployeeName: r.techSupportEmployeeName, status: r.status, dateTime: r.dateTime })),
                        verifications: todaysVerificationsList.map((v) => ({ _id: v._id, name: v.name, amount: v.amount, verificationEmployeeName: v.verificationEmployeeName, verificationStatus: v.verificationStatus, feedbackRating: v.feedbackRating })),
                    },
                },
            },
            groups: groups.map((group) => ({ ...group.toObject(), ...groupMetadata.find((metadata) => metadata.id === group._id.toString()) })),
            chatEmployees,
            recentMessages,
            notifications: { unread: unreadNotificationCount },
            announcements: { unread: unreadAnnouncementCount },
            remoteSupportSummary,
            projectSummary,
            leave: {
                present: await Attendance_1.Attendance.countDocuments({ companyId: actualCompanyId, date: { $gte: (0, businessDate_1.getBusinessDayStart)(), $lt: (0, businessDate_1.getBusinessDayEnd)() }, status: index_2.AttendanceStatus.PRESENT }),
                absent: await Attendance_1.Attendance.countDocuments({ companyId: actualCompanyId, date: { $gte: (0, businessDate_1.getBusinessDayStart)(), $lt: (0, businessDate_1.getBusinessDayEnd)() }, status: index_2.AttendanceStatus.ABSENT }),
                holiday: await Attendance_1.Attendance.countDocuments({ companyId: actualCompanyId, date: { $gte: (0, businessDate_1.getBusinessDayStart)(), $lt: (0, businessDate_1.getBusinessDayEnd)() }, status: index_2.AttendanceStatus.HOLIDAY }),
                totalEmployees: employeeCount,
            },
        };
    }
    static async createEmployee(companyId, data) {
        // Allow empty email (optional)
        if (data.email) {
            const existing = await Employee_1.Employee.findOne({ companyId, email: data.email.toLowerCase() });
            if (existing) {
                throw { statusCode: 400, message: 'Employee with this email already exists for the company.' };
            }
        }
        const generateEmployeeId = () => {
            const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
            let id = '';
            for (let i = 0; i < 8; i++) {
                id += chars.charAt(Math.floor(Math.random() * chars.length));
            }
            if (!/[A-Z]/.test(id) || !/[0-9]/.test(id)) {
                return generateEmployeeId();
            }
            return id;
        };
        let employeeId = generateEmployeeId();
        while (await Employee_1.Employee.exists({ companyId, employeeId })) {
            employeeId = generateEmployeeId();
        }
        const passwordHash = await bcrypt_1.default.hash(data.password, 10);
        const employee = await Employee_1.Employee.create({
            companyId,
            employeeId,
            name: data.name,
            email: data.email ? data.email.toLowerCase() : undefined,
            passwordHash,
            phone: data.phone,
            role: data.role,
            monthlySalesTarget: data.monthlySalesTarget || 0,
            monthlySalesAchieved: 0,
            remoteTarget: data.remoteTarget || 0,
            permissions: data.permissions || [],
            isSuspended: false,
            refreshTokens: [],
        });
        return { id: employee._id, employeeId: employee.employeeId, name: employee.name, email: employee.email, role: employee.role, permissions: employee.permissions };
    }
    static async getEmployees(companyId, currentEmployeeId) {
        const employees = await Employee_1.Employee.find({ companyId, _id: { $ne: currentEmployeeId } }).select('-passwordHash -refreshTokens').sort({ createdAt: -1 });
        const currentMonth = (0, businessDate_1.getBusinessMonthString)();
        const { start: monthStart, end: monthEnd } = (0, businessDate_1.getBusinessMonthRange)(currentMonth);
        return Promise.all(employees.map(async (employee) => {
            const [latestMessage, unreadCount, monthlySalesTotal] = await Promise.all([
                Message_1.Message.findOne({ companyId, $or: [{ senderId: employee._id }, { recipientId: employee._id }] }).sort({ createdAt: -1 }).select('createdAt'),
                Message_1.Message.countDocuments({ companyId, senderId: employee._id, recipientId: currentEmployeeId, readBy: { $ne: currentEmployeeId } }),
                Sale_1.Sale.aggregate([
                    {
                        $match: {
                            companyId: new mongoose_1.Types.ObjectId(companyId),
                            failed: { $ne: true },
                            createdAt: { $gte: monthStart, $lt: monthEnd },
                            $or: [
                                { salesEmployeeId: employee._id },
                                { salesEmployeeName: employee.name },
                                { connectedBy: employee.name },
                                { connectedBy: employee.employeeId },
                            ],
                        },
                    },
                    { $group: { _id: null, total: { $sum: { $ifNull: ['$finalAmount', '$amount'] } } } },
                ]),
            ]);
            return {
                ...employee.toObject(),
                monthlySalesAchieved: monthlySalesTotal[0]?.total || 0,
                latestChatAt: latestMessage?.createdAt || null,
                unreadCount,
            };
        }));
    }
    static async updateEmployeePermissions(companyId, employeeId, permissions) {
        const employee = await Employee_1.Employee.findOneAndUpdate({ companyId, _id: employeeId }, { permissions }, { new: true });
        if (!employee) {
            throw { statusCode: 404, message: 'Employee not found.' };
        }
        return { id: employee._id, permissions: employee.permissions };
    }
    static async updateEmployeeStatus(companyId, employeeId, isSuspended) {
        const employee = await Employee_1.Employee.findOne({ companyId, _id: employeeId });
        if (!employee) {
            throw { statusCode: 404, message: 'Employee not found.' };
        }
        if (employee.role === index_1.Roles.COMPANY_ADMIN) {
            throw { statusCode: 400, message: 'Company admin accounts cannot be blocked.' };
        }
        employee.isSuspended = isSuspended;
        if (isSuspended)
            employee.refreshTokens = [];
        await employee.save();
        return { id: employee._id, isSuspended: employee.isSuspended };
    }
    static async deleteEmployee(companyId, employeeId) {
        const employee = await Employee_1.Employee.findOne({ companyId, _id: employeeId });
        if (!employee) {
            throw { statusCode: 404, message: 'Employee not found.' };
        }
        if (employee.role === index_1.Roles.COMPANY_ADMIN) {
            throw { statusCode: 400, message: 'Company admin accounts cannot be deleted.' };
        }
        await Employee_1.Employee.deleteOne({ _id: employee._id, companyId });
    }
    static async updateEmployee(companyId, employeeId, data) {
        const employee = await Employee_1.Employee.findOne({ companyId, _id: employeeId });
        if (!employee) {
            throw { statusCode: 404, message: 'Employee not found.' };
        }
        if (data.email && data.email.toLowerCase() !== employee.email) {
            const existing = await Employee_1.Employee.findOne({ companyId, email: data.email.toLowerCase() });
            if (existing) {
                throw { statusCode: 400, message: 'Employee with this email already exists for the company.' };
            }
            employee.email = data.email.toLowerCase();
        }
        if (data.name)
            employee.name = data.name;
        if (data.phone)
            employee.phone = data.phone;
        if (data.role)
            employee.role = data.role;
        if (data.password)
            employee.passwordHash = await bcrypt_1.default.hash(data.password, 10);
        if (data.monthlySalesTarget !== undefined)
            employee.monthlySalesTarget = data.monthlySalesTarget;
        if (data.remoteTarget !== undefined)
            employee.remoteTarget = data.remoteTarget;
        if (data.salaryAmount !== undefined)
            employee.salaryAmount = data.salaryAmount;
        if (data.salaryMonth !== undefined)
            employee.salaryMonth = data.salaryMonth;
        if (data.salaryCredited !== undefined)
            employee.salaryCredited = data.salaryCredited;
        if (data.permissions)
            employee.permissions = data.permissions;
        await employee.save();
        return {
            id: employee._id,
            employeeId: employee.employeeId,
            name: employee.name,
            email: employee.email,
            phone: employee.phone,
            role: employee.role,
            monthlySalesTarget: employee.monthlySalesTarget,
            remoteTarget: employee.remoteTarget,
            salaryAmount: employee.salaryAmount,
            salaryMonth: employee.salaryMonth,
            salaryCredited: employee.salaryCredited,
            isSuspended: employee.isSuspended,
            permissions: employee.permissions,
        };
    }
    static async createGroup(companyId, creatorId, data) {
        const selectedMemberIds = Array.from(new Set(data.memberIds || []));
        const memberIds = data.privacy === 'private' ? Array.from(new Set([creatorId, ...selectedMemberIds])) : [];
        if (data.privacy === 'private') {
            const validMembers = await Employee_1.Employee.countDocuments({ companyId, _id: { $in: selectedMemberIds }, role: { $ne: index_1.Roles.COMPANY_ADMIN }, isSuspended: false });
            if (validMembers !== selectedMemberIds.length) {
                throw { statusCode: 400, message: 'One or more selected employees are invalid or unavailable.' };
            }
        }
        const group = await Group_1.Group.create({
            companyId,
            createdBy: creatorId,
            name: data.name,
            description: data.description || '',
            privacy: data.privacy || 'public',
            members: memberIds,
        });
        return group;
    }
    static async updateGroup(companyId, groupId, data) {
        if (!mongoose_1.Types.ObjectId.isValid(groupId))
            throw { statusCode: 404, message: 'Group not found.' };
        const group = await Group_1.Group.findOne({ _id: groupId, companyId });
        if (!group)
            throw { statusCode: 404, message: 'Group not found.' };
        const nextPrivacy = data.privacy || group.privacy;
        if (data.name !== undefined)
            group.name = data.name;
        if (data.description !== undefined)
            group.description = data.description;
        group.privacy = nextPrivacy;
        if (nextPrivacy === 'public') {
            group.members = [];
        }
        else if (data.memberIds !== undefined) {
            const selectedMemberIds = Array.from(new Set(data.memberIds));
            const validMembers = await Employee_1.Employee.countDocuments({ companyId, _id: { $in: selectedMemberIds }, role: { $ne: index_1.Roles.COMPANY_ADMIN }, isSuspended: false });
            if (validMembers !== selectedMemberIds.length)
                throw { statusCode: 400, message: 'One or more selected employees are invalid or unavailable.' };
            group.members = Array.from(new Set([group.createdBy.toString(), ...selectedMemberIds]));
        }
        await group.save();
        return group;
    }
    static async deleteGroup(companyId, groupId) {
        if (!mongoose_1.Types.ObjectId.isValid(groupId))
            throw { statusCode: 404, message: 'Group not found.' };
        const group = await Group_1.Group.findOneAndDelete({ _id: groupId, companyId });
        if (!group)
            throw { statusCode: 404, message: 'Group not found.' };
        await Message_1.Message.deleteMany({ companyId, groupId });
    }
    static async postGroupMessage(companyId, senderId, role, groupId, data) {
        if (!mongoose_1.Types.ObjectId.isValid(groupId)) {
            throw { statusCode: 404, message: 'Group not found.' };
        }
        const group = await Group_1.Group.findOne({ _id: groupId, companyId });
        if (!group) {
            throw { statusCode: 404, message: 'Group not found.' };
        }
        if (role !== index_1.Roles.COMPANY_ADMIN && group.privacy === 'private' && !group.members.some((memberId) => memberId.toString() === senderId.toString()) && group.createdBy.toString() !== senderId.toString()) {
            throw { statusCode: 403, message: 'Access denied to private group.' };
        }
        const message = await Message_1.Message.create({
            companyId,
            groupId,
            senderId,
            content: data.content,
            messageType: data.messageType || 'TEXT',
            fileName: data.fileName,
            mimeType: data.mimeType,
            objectKey: data.objectKey,
            fileSize: data.fileSize,
            duration: data.duration,
            readBy: [senderId],
        });
        return message;
    }
    static async getGroupMessages(companyId, userId, role, groupId) {
        if (!mongoose_1.Types.ObjectId.isValid(groupId)) {
            throw { statusCode: 404, message: 'Group not found.' };
        }
        const group = await Group_1.Group.findOne({ _id: groupId, companyId });
        if (!group) {
            throw { statusCode: 404, message: 'Group not found.' };
        }
        if (role !== index_1.Roles.COMPANY_ADMIN && group.privacy === 'private' && !group.members.some((memberId) => memberId.toString() === userId.toString()) && group.createdBy.toString() !== userId.toString()) {
            throw { statusCode: 403, message: 'Access denied to private group.' };
        }
        await Message_1.Message.updateMany({ companyId, groupId, senderId: { $ne: userId } }, { $addToSet: { readBy: userId } });
        const messages = await Message_1.Message.find({ companyId, groupId }).populate('senderId', 'name').sort({ createdAt: 1 });
        return messages.map((message) => messageWithSender(message, userId));
    }
    static async getConversationMessages(companyId, userId, role, conversationId) {
        const isObjectId = mongoose_1.Types.ObjectId.isValid(conversationId);
        const group = isObjectId ? await Group_1.Group.findOne({ _id: conversationId, companyId }) : null;
        if (group) {
            if (role !== index_1.Roles.COMPANY_ADMIN && group.privacy === 'private' && !group.members.some((memberId) => memberId.toString() === userId.toString()) && group.createdBy.toString() !== userId.toString()) {
                throw { statusCode: 403, message: 'Access denied to private group.' };
            }
            const messages = await Message_1.Message.find({ companyId, groupId: conversationId }).populate('senderId', 'name').sort({ createdAt: 1 });
            return messages.map((message) => messageWithSender(message, userId));
        }
        if (!isObjectId)
            throw { statusCode: 404, message: 'Conversation not found.' };
        const employee = await Employee_1.Employee.findOne({ companyId, _id: conversationId });
        if (!employee)
            throw { statusCode: 404, message: 'Conversation not found.' };
        const messages = await Message_1.Message.find({
            companyId,
            $or: [
                { senderId: userId, recipientId: conversationId },
                { senderId: conversationId, recipientId: userId },
            ],
        }).populate('senderId', 'name').sort({ createdAt: 1 });
        return messages.map((message) => messageWithSender(message, userId));
    }
    static async postConversationMessage(companyId, userId, role, conversationId, content, data) {
        const isObjectId = mongoose_1.Types.ObjectId.isValid(conversationId);
        const group = isObjectId ? await Group_1.Group.findOne({ _id: conversationId, companyId }) : null;
        if (group) {
            if (role !== index_1.Roles.COMPANY_ADMIN && group.privacy === 'private' && !group.members.some((memberId) => memberId.toString() === userId.toString()) && group.createdBy.toString() !== userId.toString()) {
                throw { statusCode: 403, message: 'Access denied to private group.' };
            }
            return Message_1.Message.create({ companyId, groupId: conversationId, senderId: userId, content, messageType: data?.messageType || 'TEXT', fileName: data?.fileName, mimeType: data?.mimeType, objectKey: data?.objectKey, fileSize: data?.fileSize, duration: data?.duration, readBy: [userId] });
        }
        if (!isObjectId)
            throw { statusCode: 404, message: 'Conversation not found.' };
        const employee = await Employee_1.Employee.findOne({ companyId, _id: conversationId });
        if (!employee)
            throw { statusCode: 404, message: 'Conversation not found.' };
        return Message_1.Message.create({ companyId, senderId: userId, recipientId: conversationId, content, messageType: data?.messageType || 'TEXT', fileName: data?.fileName, mimeType: data?.mimeType, objectKey: data?.objectKey, fileSize: data?.fileSize, duration: data?.duration, readBy: [userId] });
    }
    static async updateMessage(companyId, userId, messageId, content) {
        const message = await Message_1.Message.findOne({ companyId, _id: messageId });
        if (!message)
            throw { statusCode: 404, message: 'Message not found.' };
        const ownsMessage = message.senderId.toString() === userId;
        const conversationId = message.groupId?.toString() || (message.senderId.toString() === userId ? message.recipientId?.toString() : message.senderId.toString());
        const isWorkflowUpdate = (() => { try {
            return JSON.parse(content)?.type === 'lead-workflow';
        }
        catch {
            return false;
        } })();
        if (!ownsMessage && (!isWorkflowUpdate || !conversationId || !(await this.canAccessConversation(companyId, userId, index_1.Roles.EMPLOYEE, conversationId)))) {
            throw { statusCode: 404, message: 'Message not found or you are not allowed to update it.' };
        }
        const updated = await Message_1.Message.findOneAndUpdate({ _id: messageId, companyId }, { content, editedAt: new Date() }, { new: true, runValidators: true });
        return { ...updated.toObject(), isMine: updated.senderId.toString() === userId };
    }
    static async deleteMessage(companyId, userId, messageId) {
        const message = await Message_1.Message.findOneAndDelete({ companyId, _id: messageId, senderId: userId });
        if (!message)
            throw { statusCode: 404, message: 'Message not found or you are not the owner.' };
        return { id: messageId, groupId: message.groupId?.toString(), senderId: message.senderId.toString(), recipientId: message.recipientId?.toString() };
    }
}
exports.CompanyAuthService = CompanyAuthService;
