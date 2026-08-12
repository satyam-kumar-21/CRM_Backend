"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.RemoteSupportService = void 0;
const mongoose_1 = require("mongoose");
const RemoteSupport_1 = require("../models/RemoteSupport");
const Lead_1 = require("../models/Lead");
const Employee_1 = require("../models/Employee");
const index_1 = require("../constants/index");
class RemoteSupportService {
    static async list(companyId, role, employeeId, filters = {}) {
        const query = { companyId };
        if (role === index_1.Roles.TECH_SUPPORT) {
            query.$or = [
                { techSupportEmployeeId: new mongoose_1.Types.ObjectId(employeeId) },
                { status: 'PENDING', techSupportEmployeeId: null },
                { status: 'PENDING', techSupportEmployeeId: { $exists: false } }
            ];
        }
        else if (role === index_1.Roles.SALES) {
            query.salesEmployeeId = new mongoose_1.Types.ObjectId(employeeId);
        }
        if (filters.status) {
            query.status = filters.status;
            if (role === index_1.Roles.TECH_SUPPORT && filters.status === 'PENDING') {
                delete query.$or;
                query.status = 'PENDING';
                query.$or = [
                    { techSupportEmployeeId: new mongoose_1.Types.ObjectId(employeeId) },
                    { techSupportEmployeeId: null },
                    { techSupportEmployeeId: { $exists: false } }
                ];
            }
        }
        if (filters.customerName)
            query.customerName = new RegExp(filters.customerName, 'i');
        if (filters.salesEmployeeName)
            query.salesEmployeeName = new RegExp(filters.salesEmployeeName, 'i');
        if (filters.techSupportEmployeeName)
            query.techSupportEmployeeName = new RegExp(filters.techSupportEmployeeName, 'i');
        if (filters.leadId && mongoose_1.Types.ObjectId.isValid(filters.leadId))
            query.leadId = new mongoose_1.Types.ObjectId(filters.leadId);
        if (filters.failedReason)
            query.failedReason = new RegExp(filters.failedReason, 'i');
        if (filters.fromDate)
            query.dateTime = { ...query.dateTime, $gte: new Date(filters.fromDate) };
        if (filters.toDate)
            query.dateTime = { ...query.dateTime, $lt: new Date(filters.toDate) };
        return RemoteSupport_1.RemoteSupport.find(query).sort({ dateTime: -1, createdAt: -1 });
    }
    static async create(companyId, data) {
        const salesEmployee = await Employee_1.Employee.findOne({ companyId, _id: data.salesEmployeeId, isSuspended: false });
        if (!salesEmployee)
            throw { statusCode: 404, message: 'Sales employee not found.' };
        const techEmployee = data.techSupportEmployeeId
            ? await Employee_1.Employee.findOne({ companyId, _id: data.techSupportEmployeeId, isSuspended: false })
            : null;
        const record = await RemoteSupport_1.RemoteSupport.create({
            companyId,
            leadId: data.leadId ? new mongoose_1.Types.ObjectId(data.leadId) : undefined,
            workflowMessageId: data.workflowMessageId || '',
            customerName: data.customerName,
            customerContact: data.customerContact,
            country: data.country || '',
            system: data.system || '',
            otherDetails: data.otherDetails || '',
            salesEmployeeId: new mongoose_1.Types.ObjectId(data.salesEmployeeId),
            salesEmployeeName: data.salesEmployeeName,
            techSupportEmployeeId: techEmployee ? techEmployee._id : undefined,
            techSupportEmployeeName: techEmployee ? techEmployee.name : data.techSupportEmployeeName || '',
            dateTime: data.dateTime,
            issueReason: data.issueReason,
            status: 'PENDING',
        });
        return record;
    }
    static async accept(companyId, employeeId, id) {
        const employee = await Employee_1.Employee.findOne({ companyId, _id: employeeId, isSuspended: false });
        if (!employee)
            throw { statusCode: 404, message: 'Tech support employee not found.' };
        const record = await RemoteSupport_1.RemoteSupport.findOneAndUpdate({
            companyId,
            _id: id,
            status: 'PENDING',
            $or: [
                { techSupportEmployeeId: null },
                { techSupportEmployeeId: { $exists: false } },
                { techSupportEmployeeId: employee._id }
            ]
        }, {
            status: 'IN_PROGRESS',
            techSupportEmployeeId: employee._id,
            techSupportEmployeeName: employee.name,
            acceptedAt: new Date(),
        }, { new: true, runValidators: true });
        if (!record) {
            throw { statusCode: 409, message: 'This support request has already been accepted or assigned to another employee.' };
        }
        return record;
    }
    static async reject(companyId, employeeId, id, rejectedReason) {
        if (!rejectedReason || !rejectedReason.trim()) {
            throw { statusCode: 400, message: 'Rejection reason is required.' };
        }
        const employee = await Employee_1.Employee.findOne({ companyId, _id: employeeId });
        const record = await RemoteSupport_1.RemoteSupport.findOne({ companyId, _id: id });
        if (!record)
            throw { statusCode: 404, message: 'Remote support record not found.' };
        record.status = 'REJECTED';
        record.rejectedReason = rejectedReason.trim();
        record.rejectedBy = new mongoose_1.Types.ObjectId(employeeId);
        record.rejectedByName = employee?.name || 'Tech Support';
        record.rejectedAt = new Date();
        if (!record.techSupportEmployeeId) {
            record.techSupportEmployeeId = new mongoose_1.Types.ObjectId(employeeId);
            record.techSupportEmployeeName = employee?.name || 'Tech Support';
        }
        await record.save();
        if (record.leadId) {
            await Lead_1.Lead.findOneAndUpdate({ companyId, _id: record.leadId }, { status: 'COMPLETED', completionReason: record.rejectedReason }, { new: true });
        }
        return record;
    }
    static async complete(companyId, employeeId, id, data) {
        const record = await RemoteSupport_1.RemoteSupport.findOne({ companyId, _id: id });
        if (!record)
            throw { statusCode: 404, message: 'Remote support record not found.' };
        const employee = await Employee_1.Employee.findOne({ companyId, _id: employeeId });
        if (data.status === 'SUCCESSFUL') {
            record.status = 'SUCCESSFUL';
            record.completedAt = new Date();
            if (!record.techSupportEmployeeId) {
                record.techSupportEmployeeId = new mongoose_1.Types.ObjectId(employeeId);
                record.techSupportEmployeeName = employee?.name || 'Tech Support';
            }
        }
        else if (data.status === 'FAILED') {
            if (!data.failedReason || !data.failedReason.trim()) {
                throw { statusCode: 400, message: 'Failure reason is required when marking support as failed.' };
            }
            record.status = 'FAILED';
            record.failedReason = data.failedReason.trim();
            record.failedBy = new mongoose_1.Types.ObjectId(employeeId);
            record.failedByName = employee?.name || 'Tech Support';
            record.failedAt = new Date();
            if (!record.techSupportEmployeeId) {
                record.techSupportEmployeeId = new mongoose_1.Types.ObjectId(employeeId);
                record.techSupportEmployeeName = employee?.name || 'Tech Support';
            }
            if (record.leadId) {
                await Lead_1.Lead.findOneAndUpdate({ companyId, _id: record.leadId }, { status: 'COMPLETED', completionReason: record.failedReason }, { new: true });
            }
        }
        await record.save();
        return record;
    }
    static async assign(companyId, id, techSupportEmployeeId) {
        const techEmployee = await Employee_1.Employee.findOne({ companyId, _id: techSupportEmployeeId, isSuspended: false });
        if (!techEmployee)
            throw { statusCode: 404, message: 'Tech support employee not found.' };
        const record = await RemoteSupport_1.RemoteSupport.findOneAndUpdate({ companyId, _id: id }, {
            techSupportEmployeeId: techEmployee._id,
            techSupportEmployeeName: techEmployee.name,
            status: 'IN_PROGRESS',
            acceptedAt: new Date(),
        }, { new: true, runValidators: true });
        if (!record)
            throw { statusCode: 404, message: 'Remote support record not found.' };
        return record;
    }
    static async update(companyId, role, employeeId, id, data) {
        const record = await RemoteSupport_1.RemoteSupport.findOne({ companyId, _id: id });
        if (!record)
            throw { statusCode: 404, message: 'Remote support record not found.' };
        if (role === index_1.Roles.TECH_SUPPORT) {
            if (record.techSupportEmployeeId && record.techSupportEmployeeId.toString() !== employeeId && record.status !== 'PENDING') {
                throw { statusCode: 403, message: 'Not authorized to update this remote support record.' };
            }
        }
        if (data.status) {
            record.status = data.status;
        }
        if (data.techSupportEmployeeId) {
            const techEmployee = await Employee_1.Employee.findOne({ companyId, _id: data.techSupportEmployeeId, isSuspended: false });
            if (!techEmployee)
                throw { statusCode: 404, message: 'Tech support employee not found.' };
            record.techSupportEmployeeId = techEmployee._id;
            record.techSupportEmployeeName = techEmployee.name;
        }
        if (data.status === 'FAILED') {
            if (!data.failedReason || !data.failedReason.trim()) {
                throw { statusCode: 400, message: 'Failed reason is required for failed remote support.' };
            }
            record.failedReason = data.failedReason.trim();
            record.rejectedReason = '';
            record.failedBy = new mongoose_1.Types.ObjectId(employeeId);
            const failingEmployee = await Employee_1.Employee.findOne({ companyId, _id: employeeId });
            record.failedByName = failingEmployee?.name || 'Unknown';
            record.failedAt = new Date();
            record.rejectedBy = undefined;
            record.rejectedByName = '';
            record.rejectedAt = undefined;
        }
        if (data.status === 'REJECTED') {
            if (!data.rejectedReason || !data.rejectedReason.trim()) {
                throw { statusCode: 400, message: 'Rejected reason is required for rejected remote support.' };
            }
            record.rejectedReason = data.rejectedReason.trim();
            record.failedReason = '';
            record.rejectedBy = new mongoose_1.Types.ObjectId(employeeId);
            const rejectingEmployee = await Employee_1.Employee.findOne({ companyId, _id: employeeId });
            record.rejectedByName = rejectingEmployee?.name || 'Unknown';
            record.rejectedAt = new Date();
            record.failedBy = undefined;
            record.failedByName = '';
            record.failedAt = undefined;
        }
        await record.save();
        if ((data.status === 'FAILED' || data.status === 'REJECTED') && record.leadId) {
            await Lead_1.Lead.findOneAndUpdate({ companyId, _id: record.leadId }, {
                status: 'COMPLETED',
                completionReason: data.status === 'FAILED' ? record.failedReason : record.rejectedReason,
            }, { new: true, runValidators: true });
        }
        return record;
    }
    static async delete(companyId, role, employeeId, id) {
        const record = await RemoteSupport_1.RemoteSupport.findOne({ companyId, _id: id });
        if (!record)
            throw { statusCode: 404, message: 'Remote support record not found.' };
        if (role === index_1.Roles.TECH_SUPPORT) {
            if (!record.techSupportEmployeeId || record.techSupportEmployeeId.toString() !== employeeId) {
                throw { statusCode: 403, message: 'Not authorized to delete this remote support record.' };
            }
        }
        if (role === index_1.Roles.SALES) {
            if (record.salesEmployeeId.toString() !== employeeId) {
                throw { statusCode: 403, message: 'Not authorized to delete this remote support record.' };
            }
        }
        await record.deleteOne();
        return;
    }
    static async summarize(companyId, role, employeeId) {
        const query = { companyId };
        if (role === index_1.Roles.TECH_SUPPORT) {
            query.$or = [
                { techSupportEmployeeId: new mongoose_1.Types.ObjectId(employeeId) },
                { status: 'PENDING', techSupportEmployeeId: null },
                { status: 'PENDING', techSupportEmployeeId: { $exists: false } }
            ];
        }
        else if (role === index_1.Roles.SALES) {
            query.salesEmployeeId = new mongoose_1.Types.ObjectId(employeeId);
        }
        const total = await RemoteSupport_1.RemoteSupport.countDocuments(query);
        const successful = await RemoteSupport_1.RemoteSupport.countDocuments({ ...query, status: 'SUCCESSFUL' });
        const failed = await RemoteSupport_1.RemoteSupport.countDocuments({ ...query, status: 'FAILED' });
        const pending = await RemoteSupport_1.RemoteSupport.countDocuments({ ...query, status: 'PENDING' });
        const inProgress = await RemoteSupport_1.RemoteSupport.countDocuments({ ...query, status: 'IN_PROGRESS' });
        const recent = await RemoteSupport_1.RemoteSupport.find(query).sort({ dateTime: -1 }).limit(5);
        return { total, successful, failed, pending, inProgress, successRate: total ? Math.round((successful / total) * 100) : 0, recent };
    }
}
exports.RemoteSupportService = RemoteSupportService;
