import bcrypt from 'bcrypt';
import { Types } from 'mongoose';
import { Employee, IEmployee } from '../models/Employee';
import { Company } from '../models/Company';
import { Roles, CompanyStatus } from '../constants/index';
import { generateAccessToken, generateRefreshToken, ITokenPayload } from '../utils/jwt';
import { Group } from '../models/Group';
import { Message, IMessage } from '../models/Message';
import { Lead } from '../models/Lead';
import { Sale } from '../models/Sale';
import { Attendance } from '../models/Attendance';
import { Leave } from '../models/Leave';
import { Announcement } from '../models/Announcement';
import { Notification } from '../models/Notification';
import { RemoteSupportService } from './remoteSupportService';
import { RemoteSupport } from '../models/RemoteSupport';
import { ProjectService } from './projectService';
import { AttendanceStatus, LeaveStatus } from '../constants/index';
import { getBusinessDayEnd, getBusinessDayStart } from '../utils/businessDate';


const messageWithSender = (message: IMessage, userId: string) => {
  const sender = message.senderId as unknown as { _id?: unknown; name?: string };
  return {
    ...message.toObject(),
    senderName: sender.name || 'Workspace member',
    isMine: String(sender._id || sender) === userId,
    isSeen: message.readBy?.some((readerId) => readerId.toString() !== userId) || false,
    isEdited: Boolean(message.editedAt),
  };
};

export class CompanyAuthService {
  static async canAccessConversation(companyId: string, userId: string, role: Roles, conversationId: string) {
    if (!Types.ObjectId.isValid(conversationId)) return false;
    const group = await Group.findOne({ _id: conversationId, companyId });
    if (group) return role === Roles.COMPANY_ADMIN || group.privacy === 'public' || group.createdBy.toString() === userId || group.members.some((memberId) => memberId.toString() === userId);
    const employee = await Employee.findOne({ companyId, _id: conversationId, isSuspended: false });
    return Boolean(employee);
  }

  static async getRealtimeMessage(companyId: string, userId: string, messageId: string) {
    const message = await Message.findOne({ companyId, _id: messageId }).populate('senderId', 'name');
    return message ? messageWithSender(message, userId) : null;
  }

  static async markConversationRead(companyId: string, userId: string, role: Roles, conversationId: string) {
    const allowed = await this.canAccessConversation(companyId, userId, role, conversationId);
    if (!allowed) return { senderIds: [], messageIds: [] };
    const isGroup = Boolean(await Group.exists({ _id: conversationId, companyId }));
    const filter = isGroup
      ? { companyId, groupId: conversationId, senderId: { $ne: userId } }
      : { companyId, recipientId: userId, senderId: conversationId };
    const unread = await Message.find({ ...filter, readBy: { $ne: userId } }).select('_id senderId');
    if (!unread.length) return { senderIds: [], messageIds: [] };
    await Message.updateMany({ _id: { $in: unread.map((message) => message._id) } }, { $addToSet: { readBy: userId } });
    return {
      senderIds: Array.from(new Set(unread.map((message) => message.senderId.toString()))),
      messageIds: unread.map((message) => message._id.toString()),
    };
  }

  static async getConversationAudience(companyId: string, conversationId: string) {
    if (!Types.ObjectId.isValid(conversationId)) return [];
    const group = await Group.findOne({ _id: conversationId, companyId });
    if (group) {
      if (group.privacy === 'private') return Array.from(new Set([group.createdBy.toString(), ...group.members.map((id) => id.toString())]));
      const employees = await Employee.find({ companyId, isSuspended: false }).select('_id');
      return employees.map((employee) => employee._id.toString());
    }
    const employee = await Employee.findOne({ companyId, _id: conversationId, isSuspended: false }).select('_id');
    return employee ? [employee._id.toString()] : [];
  }

  static async login(identifier: string, password: string) {
    const company = await Company.findOne({ status: CompanyStatus.ACTIVE });
    if (!company) {
      throw { statusCode: 401, message: 'Company not configured.' };
    }
    let employee: IEmployee | null = null;
    if (identifier.includes('@')) {
      employee = await Employee.findOne({ companyId: company._id, email: identifier.toLowerCase() });
    } else {
      employee = await Employee.findOne({ companyId: company._id, employeeId: identifier.trim() });
    }
    if (!employee || employee.isSuspended) {
      throw { statusCode: 401, message: 'Invalid employee credentials or account suspended.' };
    }

    // If employee login is disabled for company, block non-admins
    if (company.settings && company.settings.employeeLoginEnabled === false && employee.role !== Roles.COMPANY_ADMIN) {
      throw { statusCode: 403, message: 'Employee login is currently disabled by Admin.' };
    }

    const isMatch = await bcrypt.compare(password, employee.passwordHash);
    if (!isMatch) {
      throw { statusCode: 401, message: 'Invalid employee credentials.' };
    }

    const payload: ITokenPayload = {
      id: employee._id.toString(),
      role: employee.role,
      companyId: company._id.toString(),
      portalType: employee.role === Roles.COMPANY_ADMIN ? 'COMPANY_ADMIN' : 'EMPLOYEE',
    };

    const accessToken = generateAccessToken(payload);
    const refreshToken = generateRefreshToken(payload);

    employee.refreshTokens.push(refreshToken);
    await employee.save();
    const dayStart = getBusinessDayStart();
    const dayEnd = getBusinessDayEnd();
    await Attendance.findOneAndUpdate(
      { companyId: company._id, employeeId: employee._id, date: { $gte: dayStart, $lt: dayEnd } },
      { $setOnInsert: { date: dayStart, checkIn: new Date(), status: AttendanceStatus.PRESENT, workHours: 0 } },
      { upsert: true, new: true },
    );

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

  static async recordLogout(employeeId: string, companyId: string) {
    const dayStart = getBusinessDayStart();
    const dayEnd = getBusinessDayEnd();
    const attendance = await Attendance.findOne({ companyId, employeeId, date: { $gte: dayStart, $lt: dayEnd } });
    if (!attendance || !attendance.checkIn) return;
    const checkOut = new Date();
    attendance.checkOut = checkOut;
    attendance.workHours = Math.max(0, (checkOut.getTime() - attendance.checkIn.getTime()) / 3600000);
    await attendance.save();
  }

  static async getDashboard(employeeId: string, companyId: string, role: Roles) {
    const company = await Company.findById(companyId);
    const employee = await Employee.findOne({ companyId, _id: employeeId });
    if (!employee) {
      throw { statusCode: 404, message: 'Employee not found.' };
    }
    const employeeCount = await Employee.countDocuments({ companyId });
    const isAdmin = role === Roles.COMPANY_ADMIN;
    const pendingLeaveCount = isAdmin
      ? await Leave.countDocuments({ companyId, status: LeaveStatus.PENDING })
      : await Leave.countDocuments({ companyId, employeeId });
    const unreadAnnouncementCount = await Announcement.countDocuments({
      companyId,
      $or: [{ targetRoles: { $size: 0 } }, { targetRoles: role }],
      readBy: { $ne: employee._id },
    });
    const unreadNotificationCount = await Notification.countDocuments({
      companyId,
      recipientId: employee._id,
      isRead: false,
    });

    const nonFailedSaleFilter: any = { failed: { $ne: true } };
    const companyTotalLeads = await Lead.countDocuments({ companyId });
    const companyConnectedLeads = await Lead.countDocuments({ companyId, connected: 'yes' });
    const companyPendingLeads = await Lead.countDocuments({ companyId, connected: 'no' });
    const companyTotalSales = await Sale.countDocuments({ companyId, ...nonFailedSaleFilter });
    const companyFailedSales = await Sale.countDocuments({ companyId, failed: true });
    const companyRevenueResult = await Sale.aggregate([
      { $match: { companyId: new Types.ObjectId(companyId), ...nonFailedSaleFilter } },
      { $group: { _id: null, total: { $sum: '$amount' } } },
    ]);
    const companyRevenue = companyRevenueResult[0]?.total || 0;

    const employeeLeadFilter = {
      companyId,
      $or: [{ connectedBy: employee.name }, { connectedBy: employee.employeeId }],
    };
    const employeeLeads = await Lead.countDocuments(employeeLeadFilter);
    const employeeConnectedLeads = await Lead.countDocuments({ ...employeeLeadFilter, connected: 'yes' });
    const employeePendingLeads = await Lead.countDocuments({ ...employeeLeadFilter, connected: 'no' });
    const employeeSalesFilter = { companyId, ...nonFailedSaleFilter, $or: [{ connectedBy: employee.name }, { connectedBy: employee.employeeId }] };
    const employeeSales = await Sale.countDocuments(employeeSalesFilter);
    const employeeFailedSales = await Sale.countDocuments({ companyId, failed: true, $or: [{ connectedBy: employee.name }, { connectedBy: employee.employeeId }] });
    const employeeRevenueResult = await Sale.aggregate([
      { $match: { companyId: new Types.ObjectId(companyId), ...nonFailedSaleFilter, $or: [{ connectedBy: employee.name }, { connectedBy: employee.employeeId }] } },
      { $group: { _id: null, total: { $sum: '$amount' } } },
    ]);
    const employeeRevenue = employeeRevenueResult[0]?.total || 0;

    const groups = await Group.find(isAdmin ? { companyId } : {
      companyId,
      $or: [
        { privacy: 'public' },
        { privacy: 'private', members: employee._id },
      ],
    });
    const chatEmployees = isAdmin ? [] : await Promise.all((await Employee.find({ companyId, isSuspended: false, _id: { $ne: employeeId } }).select('_id employeeId name role email')).map(async (chatEmployee) => {
      const [latestMessage, unreadCount] = await Promise.all([
        Message.findOne({ companyId, $or: [{ senderId: chatEmployee._id, recipientId: employeeId }, { senderId: employeeId, recipientId: chatEmployee._id }] }).sort({ createdAt: -1 }).select('createdAt'),
        Message.countDocuments({ companyId, senderId: chatEmployee._id, recipientId: employeeId, readBy: { $ne: employeeId } }),
      ]);
      return { ...chatEmployee.toObject(), latestChatAt: latestMessage?.createdAt || null, unreadCount };
    }));
    const visibleGroupIds = groups.map((group) => group._id);
    const messages = await Message.find(isAdmin ? { companyId } : {
      companyId,
      $or: [
        { groupId: { $in: visibleGroupIds } },
        { senderId: employee._id },
        { recipientId: employee._id },
      ],
    }).populate('senderId', 'name').sort({ createdAt: -1 }).limit(10);
    const recentMessages = messages.map((message) => messageWithSender(message, employeeId));
    const groupMetadata = await Promise.all(groups.map(async (group) => {
      const [latestMessage, unreadCount] = await Promise.all([
        Message.findOne({ companyId, groupId: group._id }).sort({ createdAt: -1 }).select('createdAt'),
        Message.countDocuments({ companyId, groupId: group._id, senderId: { $ne: employeeId }, readBy: { $ne: employeeId } }),
      ]);
      return { id: group._id.toString(), latestChatAt: latestMessage?.createdAt || null, unreadCount };
    }));

    const remoteSupportSummary = await RemoteSupportService.summarize(companyId, role, employeeId);
    const projectSummary = await ProjectService.summary(companyId, role, employeeId);

    // Today's business-day metrics
    const todayStart = getBusinessDayStart();
    const todayEnd = getBusinessDayEnd();
    const todayLeads = await Lead.countDocuments({ companyId, createdAt: { $gte: todayStart, $lt: todayEnd } });
    const todaySalesCount = await Sale.countDocuments({ companyId, ...nonFailedSaleFilter, createdAt: { $gte: todayStart, $lt: todayEnd } });
    const todaySalesAgg = await Sale.aggregate([
      { $match: { companyId: new Types.ObjectId(companyId), ...nonFailedSaleFilter, createdAt: { $gte: todayStart, $lt: todayEnd } } },
      { $group: { _id: null, total: { $sum: '$amount' } } },
    ]);
    const todaySalesAmount = todaySalesAgg[0]?.total || 0;
    const todayFailedSales = await Sale.countDocuments({ companyId, failed: true, createdAt: { $gte: todayStart, $lt: todayEnd } });
    const todayRemoteSuccessful = await RemoteSupport.countDocuments({ companyId, status: 'SUCCESSFUL', createdAt: { $gte: todayStart, $lt: todayEnd } });
    const todayRemoteFailed = await RemoteSupport.countDocuments({ companyId, status: 'FAILED', createdAt: { $gte: todayStart, $lt: todayEnd } });
    const todayRemoteTotal = todayRemoteSuccessful + todayRemoteFailed;

    // Lists for tabular report (limited)
    const todaysLeadsList = await Lead.find({ companyId, createdAt: { $gte: todayStart, $lt: todayEnd } }).sort({ createdAt: -1 }).limit(500);
    const todaysSalesList = await Sale.find({ companyId, createdAt: { $gte: todayStart, $lt: todayEnd } }).sort({ createdAt: -1 }).limit(500);
    const todaysRemoteList = await RemoteSupportService.list(companyId, role, employeeId, { fromDate: todayStart.toISOString(), toDate: todayEnd.toISOString() });

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
        monthlySalesTarget: employee.monthlySalesTarget || 0,
        remoteTarget: employee.remoteTarget || 0,
        monthlySalesAchieved: employee.monthlySalesAchieved || 0,
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
        remoteSupportTickets: remoteSupportSummary.total,
        activeProjects: projectSummary.active,
        completedProjects: projectSummary.completed,
        pendingProjects: projectSummary.pending,
        // today's report values (business day)
        todayReport: {
          businessDate: { start: todayStart.toISOString(), end: todayEnd.toISOString() },
          leads: todayLeads,
          salesCount: todaySalesCount,
          salesAmount: todaySalesAmount,
          failedSales: todayFailedSales,
          remote: {
            successful: todayRemoteSuccessful,
            failed: todayRemoteFailed,
            total: todayRemoteTotal,
          },
          lists: {
            leads: todaysLeadsList.map((l) => ({ _id: l._id, name: l.name, country: l.country, system: l.system, createdAt: l.createdAt })),
            sales: todaysSalesList.map((s) => ({ _id: s._id, name: s.name, amount: s.amount, connectedBy: s.connectedBy, saleDate: s.saleDate, failed: s.failed })),
            remote: todaysRemoteList.map((r: any) => ({ _id: r._id, customerName: r.customerName, salesEmployeeName: r.salesEmployeeName, techSupportEmployeeName: r.techSupportEmployeeName, status: r.status, dateTime: r.dateTime })),
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
        present: await Attendance.countDocuments({ companyId, date: { $gte: getBusinessDayStart(), $lt: getBusinessDayEnd() }, status: AttendanceStatus.PRESENT }),
        absent: await Attendance.countDocuments({ companyId, date: { $gte: getBusinessDayStart(), $lt: getBusinessDayEnd() }, status: AttendanceStatus.ABSENT }),
        holiday: await Attendance.countDocuments({ companyId, date: { $gte: getBusinessDayStart(), $lt: getBusinessDayEnd() }, status: AttendanceStatus.HOLIDAY }),
        totalEmployees: employeeCount,
      },
    };
  }

  static async createEmployee(companyId: string, data: { name: string; email?: string; phone: string; role: Roles; password: string; permissions?: string[]; monthlySalesTarget?: number; remoteTarget?: number }) {
    // Allow empty email (optional)
    if (data.email) {
      const existing = await Employee.findOne({ companyId, email: data.email.toLowerCase() });
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
    while (await Employee.exists({ companyId, employeeId })) {
      employeeId = generateEmployeeId();
    }

    const passwordHash = await bcrypt.hash(data.password, 10);

    const employee = await Employee.create({
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

  static async getEmployees(companyId: string, currentEmployeeId: string) {
    const employees = await Employee.find({ companyId, _id: { $ne: currentEmployeeId } }).sort({ createdAt: -1 });
    return Promise.all(employees.map(async (employee) => {
      const [latestMessage, unreadCount] = await Promise.all([
        Message.findOne({ companyId, $or: [{ senderId: employee._id }, { recipientId: employee._id }] }).sort({ createdAt: -1 }).select('createdAt'),
        Message.countDocuments({ companyId, senderId: employee._id, recipientId: currentEmployeeId, readBy: { $ne: currentEmployeeId } }),
      ]);
      return { ...employee.toObject(), latestChatAt: latestMessage?.createdAt || null, unreadCount };
    }));
  }

  static async updateEmployeePermissions(companyId: string, employeeId: string, permissions: string[]) {
    const employee = await Employee.findOneAndUpdate(
      { companyId, _id: employeeId },
      { permissions },
      { new: true }
    );

    if (!employee) {
      throw { statusCode: 404, message: 'Employee not found.' };
    }

    return { id: employee._id, permissions: employee.permissions };
  }

  static async updateEmployeeStatus(companyId: string, employeeId: string, isSuspended: boolean) {
    const employee = await Employee.findOne({ companyId, _id: employeeId });

    if (!employee) {
      throw { statusCode: 404, message: 'Employee not found.' };
    }

    if (employee.role === Roles.COMPANY_ADMIN) {
      throw { statusCode: 400, message: 'Company admin accounts cannot be blocked.' };
    }

    employee.isSuspended = isSuspended;
    if (isSuspended) employee.refreshTokens = [];
    await employee.save();

    return { id: employee._id, isSuspended: employee.isSuspended };
  }

  static async deleteEmployee(companyId: string, employeeId: string) {
    const employee = await Employee.findOne({ companyId, _id: employeeId });

    if (!employee) {
      throw { statusCode: 404, message: 'Employee not found.' };
    }

    if (employee.role === Roles.COMPANY_ADMIN) {
      throw { statusCode: 400, message: 'Company admin accounts cannot be deleted.' };
    }

    await Employee.deleteOne({ _id: employee._id, companyId });
  }

  static async updateEmployee(companyId: string, employeeId: string, data: { name?: string; email?: string; phone?: string; role?: Roles; password?: string; monthlySalesTarget?: number; remoteTarget?: number; permissions?: string[]; salaryAmount?: number; salaryMonth?: string; salaryCredited?: boolean }) {
    const employee = await Employee.findOne({ companyId, _id: employeeId });
    if (!employee) {
      throw { statusCode: 404, message: 'Employee not found.' };
    }

    if (data.email && data.email.toLowerCase() !== employee.email) {
      const existing = await Employee.findOne({ companyId, email: data.email.toLowerCase() });
      if (existing) {
        throw { statusCode: 400, message: 'Employee with this email already exists for the company.' };
      }
      employee.email = data.email.toLowerCase();
    }

    if (data.name) employee.name = data.name;
    if (data.phone) employee.phone = data.phone;
    if (data.role) employee.role = data.role;
    if (data.password) employee.passwordHash = await bcrypt.hash(data.password, 10);
    if (data.monthlySalesTarget !== undefined) employee.monthlySalesTarget = data.monthlySalesTarget;
    if (data.remoteTarget !== undefined) employee.remoteTarget = data.remoteTarget;
    if (data.salaryAmount !== undefined) employee.salaryAmount = data.salaryAmount;
    if (data.salaryMonth !== undefined) employee.salaryMonth = data.salaryMonth;
    if (data.salaryCredited !== undefined) employee.salaryCredited = data.salaryCredited;
    if (data.permissions) employee.permissions = data.permissions;

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

  static async createGroup(companyId: string, creatorId: string, data: { name: string; description?: string; privacy?: 'public' | 'private'; memberIds?: string[] }) {
    const selectedMemberIds = Array.from(new Set(data.memberIds || []));
    const memberIds = data.privacy === 'private' ? Array.from(new Set([creatorId, ...selectedMemberIds])) : [];
    if (data.privacy === 'private') {
      const validMembers = await Employee.countDocuments({ companyId, _id: { $in: selectedMemberIds }, role: { $ne: Roles.COMPANY_ADMIN }, isSuspended: false });
      if (validMembers !== selectedMemberIds.length) {
        throw { statusCode: 400, message: 'One or more selected employees are invalid or unavailable.' };
      }
    }
    const group = await Group.create({
      companyId,
      createdBy: creatorId,
      name: data.name,
      description: data.description || '',
      privacy: data.privacy || 'public',
      members: memberIds,
    });
    return group;
  }

  static async updateGroup(companyId: string, groupId: string, data: { name?: string; description?: string; privacy?: 'public' | 'private'; memberIds?: string[] }) {
    if (!Types.ObjectId.isValid(groupId)) throw { statusCode: 404, message: 'Group not found.' };
    const group = await Group.findOne({ _id: groupId, companyId });
    if (!group) throw { statusCode: 404, message: 'Group not found.' };

    const nextPrivacy = data.privacy || group.privacy;
    if (data.name !== undefined) group.name = data.name;
    if (data.description !== undefined) group.description = data.description;
    group.privacy = nextPrivacy;
    if (nextPrivacy === 'public') {
      group.members = [];
    } else if (data.memberIds !== undefined) {
      const selectedMemberIds = Array.from(new Set(data.memberIds));
      const validMembers = await Employee.countDocuments({ companyId, _id: { $in: selectedMemberIds }, role: { $ne: Roles.COMPANY_ADMIN }, isSuspended: false });
      if (validMembers !== selectedMemberIds.length) throw { statusCode: 400, message: 'One or more selected employees are invalid or unavailable.' };
      group.members = Array.from(new Set([group.createdBy.toString(), ...selectedMemberIds])) as unknown as typeof group.members;
    }
    await group.save();
    return group;
  }

  static async deleteGroup(companyId: string, groupId: string) {
    if (!Types.ObjectId.isValid(groupId)) throw { statusCode: 404, message: 'Group not found.' };
    const group = await Group.findOneAndDelete({ _id: groupId, companyId });
    if (!group) throw { statusCode: 404, message: 'Group not found.' };
    await Message.deleteMany({ companyId, groupId });
  }

  static async postGroupMessage(companyId: string, senderId: string, role: Roles, groupId: string, data: { content: string }) {
    if (!Types.ObjectId.isValid(groupId)) {
      throw { statusCode: 404, message: 'Group not found.' };
    }
    const group = await Group.findOne({ _id: groupId, companyId });
    if (!group) {
      throw { statusCode: 404, message: 'Group not found.' };
    }
    if (role !== Roles.COMPANY_ADMIN && group.privacy === 'private' && !group.members.some((memberId) => memberId.toString() === senderId.toString()) && group.createdBy.toString() !== senderId.toString()) {
      throw { statusCode: 403, message: 'Access denied to private group.' };
    }

    const message = await Message.create({
      companyId,
      groupId,
      senderId,
      content: data.content,
      readBy: [senderId],
    });

    return message;
  }

  static async getGroupMessages(companyId: string, userId: string, role: Roles, groupId: string) {
    if (!Types.ObjectId.isValid(groupId)) {
      throw { statusCode: 404, message: 'Group not found.' };
    }
    const group = await Group.findOne({ _id: groupId, companyId });
    if (!group) {
      throw { statusCode: 404, message: 'Group not found.' };
    }
    if (role !== Roles.COMPANY_ADMIN && group.privacy === 'private' && !group.members.some((memberId) => memberId.toString() === userId.toString()) && group.createdBy.toString() !== userId.toString()) {
      throw { statusCode: 403, message: 'Access denied to private group.' };
    }
    await Message.updateMany({ companyId, groupId, senderId: { $ne: userId } }, { $addToSet: { readBy: userId } });
    const messages = await Message.find({ companyId, groupId }).populate('senderId', 'name').sort({ createdAt: 1 });
    return messages.map((message) => messageWithSender(message, userId));
  }

  static async getConversationMessages(companyId: string, userId: string, role: Roles, conversationId: string) {
    const isObjectId = Types.ObjectId.isValid(conversationId);
    const group = isObjectId ? await Group.findOne({ _id: conversationId, companyId }) : null;
    if (group) {
      if (role !== Roles.COMPANY_ADMIN && group.privacy === 'private' && !group.members.some((memberId) => memberId.toString() === userId.toString()) && group.createdBy.toString() !== userId.toString()) {
        throw { statusCode: 403, message: 'Access denied to private group.' };
      }
      const messages = await Message.find({ companyId, groupId: conversationId }).populate('senderId', 'name').sort({ createdAt: 1 });
      return messages.map((message) => messageWithSender(message, userId));
    }

    if (!isObjectId) throw { statusCode: 404, message: 'Conversation not found.' };
    const employee = await Employee.findOne({ companyId, _id: conversationId });
    if (!employee) throw { statusCode: 404, message: 'Conversation not found.' };
    const messages = await Message.find({
      companyId,
      $or: [
        { senderId: userId, recipientId: conversationId },
        { senderId: conversationId, recipientId: userId },
      ],
    }).populate('senderId', 'name').sort({ createdAt: 1 });
    return messages.map((message) => messageWithSender(message, userId));
  }

  static async postConversationMessage(companyId: string, userId: string, role: Roles, conversationId: string, content: string) {
    const isObjectId = Types.ObjectId.isValid(conversationId);
    const group = isObjectId ? await Group.findOne({ _id: conversationId, companyId }) : null;
    if (group) {
      if (role !== Roles.COMPANY_ADMIN && group.privacy === 'private' && !group.members.some((memberId) => memberId.toString() === userId.toString()) && group.createdBy.toString() !== userId.toString()) {
        throw { statusCode: 403, message: 'Access denied to private group.' };
      }
      return Message.create({ companyId, groupId: conversationId, senderId: userId, content, readBy: [userId] });
    }

    if (!isObjectId) throw { statusCode: 404, message: 'Conversation not found.' };
    const employee = await Employee.findOne({ companyId, _id: conversationId });
    if (!employee) throw { statusCode: 404, message: 'Conversation not found.' };

    return Message.create({ companyId, senderId: userId, recipientId: conversationId, content, readBy: [userId] });
  }

  static async updateMessage(companyId: string, userId: string, messageId: string, content: string) {
    const message = await Message.findOne({ companyId, _id: messageId });
    if (!message) throw { statusCode: 404, message: 'Message not found.' };
    const ownsMessage = message.senderId.toString() === userId;
    const conversationId = message.groupId?.toString() || (message.senderId.toString() === userId ? message.recipientId?.toString() : message.senderId.toString());
    const isWorkflowUpdate = (() => { try { return JSON.parse(content)?.type === 'lead-workflow'; } catch { return false; } })();
    if (!ownsMessage && (!isWorkflowUpdate || !conversationId || !(await this.canAccessConversation(companyId, userId, Roles.EMPLOYEE, conversationId)))) {
      throw { statusCode: 404, message: 'Message not found or you are not allowed to update it.' };
    }
    const updated = await Message.findOneAndUpdate({ _id: messageId, companyId }, { content, editedAt: new Date() }, { new: true, runValidators: true });
    return { ...updated!.toObject(), isMine: updated!.senderId.toString() === userId };
  }

  static async deleteMessage(companyId: string, userId: string, messageId: string) {
    const message = await Message.findOneAndDelete({ companyId, _id: messageId, senderId: userId });
    if (!message) throw { statusCode: 404, message: 'Message not found or you are not the owner.' };
    return { id: messageId, groupId: message.groupId?.toString(), senderId: message.senderId.toString(), recipientId: message.recipientId?.toString() };
  }
}
