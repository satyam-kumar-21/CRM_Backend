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
const Attendance_1 = require("../models/Attendance");
const index_2 = require("../constants/index");
const messageWithSender = (message, userId) => {
    const sender = message.senderId;
    return {
        ...message.toObject(),
        senderName: sender.name || 'Workspace member',
        isMine: String(sender._id || sender) === userId,
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
    static async login(identifier, password) {
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
        const isMatch = await bcrypt_1.default.compare(password, employee.passwordHash);
        if (!isMatch) {
            throw { statusCode: 401, message: 'Invalid employee credentials.' };
        }
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
        const dayStart = new Date();
        dayStart.setHours(0, 0, 0, 0);
        const dayEnd = new Date(dayStart);
        dayEnd.setDate(dayEnd.getDate() + 1);
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
    static async recordLogout(employeeId, companyId) {
        const dayStart = new Date();
        dayStart.setHours(0, 0, 0, 0);
        const dayEnd = new Date(dayStart);
        dayEnd.setDate(dayEnd.getDate() + 1);
        const attendance = await Attendance_1.Attendance.findOne({ companyId, employeeId, date: { $gte: dayStart, $lt: dayEnd } });
        if (!attendance || !attendance.checkIn)
            return;
        const checkOut = new Date();
        attendance.checkOut = checkOut;
        attendance.workHours = Math.max(0, (checkOut.getTime() - attendance.checkIn.getTime()) / 3600000);
        await attendance.save();
    }
    static async getDashboard(employeeId, companyId, role) {
        const company = await Company_1.Company.findById(companyId);
        const employee = await Employee_1.Employee.findOne({ companyId, _id: employeeId });
        if (!employee) {
            throw { statusCode: 404, message: 'Employee not found.' };
        }
        const employeeCount = await Employee_1.Employee.countDocuments({ companyId });
        const isAdmin = role === index_1.Roles.COMPANY_ADMIN;
        const groups = await Group_1.Group.find(isAdmin ? { companyId } : {
            companyId,
            $or: [
                { privacy: 'public' },
                { privacy: 'private', members: employee._id },
            ],
        });
        const chatEmployees = isAdmin ? [] : await Promise.all((await Employee_1.Employee.find({ companyId, isSuspended: false, _id: { $ne: employeeId } }).select('_id employeeId name role email')).map(async (chatEmployee) => {
            const [latestMessage, unreadCount] = await Promise.all([
                Message_1.Message.findOne({ companyId, $or: [{ senderId: chatEmployee._id, recipientId: employeeId }, { senderId: employeeId, recipientId: chatEmployee._id }] }).sort({ createdAt: -1 }).select('createdAt'),
                Message_1.Message.countDocuments({ companyId, senderId: chatEmployee._id, recipientId: employeeId, readBy: { $ne: employeeId } }),
            ]);
            return { ...chatEmployee.toObject(), latestChatAt: latestMessage?.createdAt || null, unreadCount };
        }));
        const visibleGroupIds = groups.map((group) => group._id);
        const messages = await Message_1.Message.find(isAdmin ? { companyId } : {
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
                Message_1.Message.findOne({ companyId, groupId: group._id }).sort({ createdAt: -1 }).select('createdAt'),
                Message_1.Message.countDocuments({ companyId, groupId: group._id, senderId: { $ne: employeeId }, readBy: { $ne: employeeId } }),
            ]);
            return { id: group._id.toString(), latestChatAt: latestMessage?.createdAt || null, unreadCount };
        }));
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
            },
            groups: groups.map((group) => ({ ...group.toObject(), ...groupMetadata.find((metadata) => metadata.id === group._id.toString()) })),
            chatEmployees,
            recentMessages,
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
        const employees = await Employee_1.Employee.find({ companyId, _id: { $ne: currentEmployeeId } }).sort({ createdAt: -1 });
        return Promise.all(employees.map(async (employee) => {
            const [latestMessage, unreadCount] = await Promise.all([
                Message_1.Message.findOne({ companyId, $or: [{ senderId: employee._id }, { recipientId: employee._id }] }).sort({ createdAt: -1 }).select('createdAt'),
                Message_1.Message.countDocuments({ companyId, senderId: employee._id, recipientId: currentEmployeeId, readBy: { $ne: currentEmployeeId } }),
            ]);
            return { ...employee.toObject(), latestChatAt: latestMessage?.createdAt || null, unreadCount };
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
    static async postConversationMessage(companyId, userId, role, conversationId, content) {
        const isObjectId = mongoose_1.Types.ObjectId.isValid(conversationId);
        const group = isObjectId ? await Group_1.Group.findOne({ _id: conversationId, companyId }) : null;
        if (group) {
            if (role !== index_1.Roles.COMPANY_ADMIN && group.privacy === 'private' && !group.members.some((memberId) => memberId.toString() === userId.toString()) && group.createdBy.toString() !== userId.toString()) {
                throw { statusCode: 403, message: 'Access denied to private group.' };
            }
            return Message_1.Message.create({ companyId, groupId: conversationId, senderId: userId, content, readBy: [userId] });
        }
        if (!isObjectId)
            throw { statusCode: 404, message: 'Conversation not found.' };
        const employee = await Employee_1.Employee.findOne({ companyId, _id: conversationId });
        if (!employee)
            throw { statusCode: 404, message: 'Conversation not found.' };
        return Message_1.Message.create({ companyId, senderId: userId, recipientId: conversationId, content, readBy: [userId] });
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
