import { Types } from 'mongoose';
import { RemoteSupport, IRemoteSupport } from '../models/RemoteSupport';
import { Employee } from '../models/Employee';
import { Roles } from '../constants/index';

export class RemoteSupportService {
  static async list(companyId: string, role: Roles, employeeId: string, filters: Record<string, any> = {}) {
    const query: any = { companyId };

    if (role === Roles.TECH_SUPPORT) {
      query.techSupportEmployeeId = new Types.ObjectId(employeeId);
    } else if (role === Roles.SALES) {
      query.salesEmployeeId = new Types.ObjectId(employeeId);
    }

    if (filters.status) query.status = filters.status;
    if (filters.customerName) query.customerName = new RegExp(filters.customerName, 'i');
    if (filters.salesEmployeeName) query.salesEmployeeName = new RegExp(filters.salesEmployeeName, 'i');
    if (filters.techSupportEmployeeName) query.techSupportEmployeeName = new RegExp(filters.techSupportEmployeeName, 'i');
    if (filters.failedReason) query.failedReason = new RegExp(filters.failedReason, 'i');
    if (filters.fromDate) query.dateTime = { ...query.dateTime, $gte: new Date(filters.fromDate) };
    if (filters.toDate) query.dateTime = { ...query.dateTime, $lt: new Date(filters.toDate) };

    return RemoteSupport.find(query).sort({ dateTime: -1, createdAt: -1 });
  }

  static async create(companyId: string, data: {
    leadId?: string;
    customerName: string;
    customerContact: string;
    salesEmployeeId: string;
    salesEmployeeName: string;
    techSupportEmployeeId?: string;
    techSupportEmployeeName?: string;
    dateTime: Date;
    issueReason: string;
  }) {
    const salesEmployee = await Employee.findOne({ companyId, _id: data.salesEmployeeId, isSuspended: false });
    if (!salesEmployee) throw { statusCode: 404, message: 'Sales employee not found.' };
    const techEmployee = data.techSupportEmployeeId
      ? await Employee.findOne({ companyId, _id: data.techSupportEmployeeId, isSuspended: false })
      : null;

    const record = await RemoteSupport.create({
      companyId,
      leadId: data.leadId ? new Types.ObjectId(data.leadId) : undefined,
      customerName: data.customerName,
      customerContact: data.customerContact,
      salesEmployeeId: new Types.ObjectId(data.salesEmployeeId),
      salesEmployeeName: data.salesEmployeeName,
      techSupportEmployeeId: techEmployee ? techEmployee._id : undefined,
      techSupportEmployeeName: techEmployee ? techEmployee.name : data.techSupportEmployeeName || '',
      dateTime: data.dateTime,
      issueReason: data.issueReason,
      status: 'PENDING',
    });

    return record;
  }

  static async update(companyId: string, role: Roles, employeeId: string, id: string, data: {
    status?: 'PENDING' | 'IN_PROGRESS' | 'SUCCESSFUL' | 'FAILED';
    techSupportEmployeeId?: string;
    failedReason?: string;
  }) {
    const record = await RemoteSupport.findOne({ companyId, _id: id });
    if (!record) throw { statusCode: 404, message: 'Remote support record not found.' };

    if (role === Roles.TECH_SUPPORT) {
      if (!record.techSupportEmployeeId || record.techSupportEmployeeId.toString() !== employeeId) {
        throw { statusCode: 403, message: 'Not authorized to update this remote support record.' };
      }
    }

    if (data.status) {
      record.status = data.status;
    }

    if (data.techSupportEmployeeId) {
      const techEmployee = await Employee.findOne({ companyId, _id: data.techSupportEmployeeId, isSuspended: false });
      if (!techEmployee) throw { statusCode: 404, message: 'Tech support employee not found.' };
      record.techSupportEmployeeId = techEmployee._id;
      record.techSupportEmployeeName = techEmployee.name;
    }

    if (data.status === 'FAILED') {
      if (!data.failedReason || !data.failedReason.trim()) {
        throw { statusCode: 400, message: 'Failed reason is required for failed remote support.' };
      }
      record.failedReason = data.failedReason.trim();
      record.failedBy = new Types.ObjectId(employeeId);
      const failingEmployee = await Employee.findOne({ companyId, _id: employeeId });
      record.failedByName = failingEmployee?.name || 'Unknown';
      record.failedAt = new Date();
    }

    await record.save();
    return record;
  }

  static async delete(companyId: string, role: Roles, employeeId: string, id: string) {
    const record = await RemoteSupport.findOne({ companyId, _id: id });
    if (!record) throw { statusCode: 404, message: 'Remote support record not found.' };

    if (role === Roles.TECH_SUPPORT) {
      if (!record.techSupportEmployeeId || record.techSupportEmployeeId.toString() !== employeeId) {
        throw { statusCode: 403, message: 'Not authorized to delete this remote support record.' };
      }
    }
    if (role === Roles.SALES) {
      if (record.salesEmployeeId.toString() !== employeeId) {
        throw { statusCode: 403, message: 'Not authorized to delete this remote support record.' };
      }
    }

    await record.deleteOne();
    return;
  }

  static async summarize(companyId: string, role: Roles, employeeId: string) {
    const query: any = { companyId };
    if (role === Roles.TECH_SUPPORT) query.techSupportEmployeeId = new Types.ObjectId(employeeId);
    if (role === Roles.SALES) query.salesEmployeeId = new Types.ObjectId(employeeId);

    const total = await RemoteSupport.countDocuments(query);
    const successful = await RemoteSupport.countDocuments({ ...query, status: 'SUCCESSFUL' });
    const failed = await RemoteSupport.countDocuments({ ...query, status: 'FAILED' });
    const pending = await RemoteSupport.countDocuments({ ...query, status: 'PENDING' });
    const inProgress = await RemoteSupport.countDocuments({ ...query, status: 'IN_PROGRESS' });
    const recent = await RemoteSupport.find(query).sort({ dateTime: -1 }).limit(5);
    return { total, successful, failed, pending, inProgress, successRate: total ? Math.round((successful / total) * 100) : 0, recent };
  }
}
