import { Types } from 'mongoose';
import { RemoteSupport, IRemoteSupport } from '../models/RemoteSupport';
import { Lead } from '../models/Lead';
import { Employee } from '../models/Employee';
import { Roles } from '../constants/index';
import { emitCompanyEvent } from '../realtime/socket';
import { getBusinessDayRange } from '../utils/businessDate';

export class RemoteSupportService {
  static async list(companyId: string, role: Roles, employeeId: string, filters: Record<string, any> = {}) {
    const query: any = { companyId };

    if (role === Roles.TECH_SUPPORT) {
      query.$or = [
        { techSupportEmployeeId: new Types.ObjectId(employeeId) },
        { status: 'PENDING', techSupportEmployeeId: null },
        { status: 'PENDING', techSupportEmployeeId: { $exists: false } }
      ];
    } else if (role === Roles.SALES) {
      query.salesEmployeeId = new Types.ObjectId(employeeId);
    }

    if (filters.status) {
      query.status = filters.status;
      if (role === Roles.TECH_SUPPORT && filters.status === 'PENDING') {
        delete query.$or;
        query.status = 'PENDING';
        query.$or = [
          { techSupportEmployeeId: new Types.ObjectId(employeeId) },
          { techSupportEmployeeId: null },
          { techSupportEmployeeId: { $exists: false } }
        ];
      }
    }
    if (filters.customerName) query.customerName = new RegExp(filters.customerName, 'i');
    if (filters.salesEmployeeName) query.salesEmployeeName = new RegExp(filters.salesEmployeeName, 'i');
    if (filters.techSupportEmployeeName) query.techSupportEmployeeName = new RegExp(filters.techSupportEmployeeName, 'i');
    if (filters.leadId && Types.ObjectId.isValid(filters.leadId)) query.leadId = new Types.ObjectId(filters.leadId);
    if (filters.failedReason) query.failedReason = new RegExp(filters.failedReason, 'i');
    if (filters.today === 'true') {
      const { start, end } = getBusinessDayRange();
      query.dateTime = { ...query.dateTime, $gte: start, $lt: end };
    }
    if (filters.fromDate) query.dateTime = { ...query.dateTime, $gte: new Date(filters.fromDate) };
    if (filters.toDate) query.dateTime = { ...query.dateTime, $lt: new Date(filters.toDate) };

    const records = await RemoteSupport.find(query).populate('salesEmployeeId', 'name employeeId').sort({ dateTime: -1, createdAt: -1 });
    return records.map((record: any) => {
      if (!record.salesEmployeeName && record.salesEmployeeId?.name) {
        record.salesEmployeeName = record.salesEmployeeId.name;
      }
      return record;
    });
  }

  static async create(companyId: string, data: {
    leadId?: string;
    workflowMessageId?: string;
    customerId?: string;
    saleId?: string;
    upgradeId?: string;
    customerName: string;
    customerContact: string;
    country?: string;
    system?: string;
    otherDetails?: string;
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
      workflowMessageId: data.workflowMessageId || '',
      customerId: data.customerId || '',
      saleId: data.saleId ? new Types.ObjectId(data.saleId) : undefined,
      upgradeId: data.upgradeId ? new Types.ObjectId(data.upgradeId) : undefined,
      customerName: data.customerName,
      customerContact: data.customerContact,
      country: data.country || '',
      system: data.system || '',
      otherDetails: data.otherDetails || '',
      salesEmployeeId: new Types.ObjectId(data.salesEmployeeId),
      salesEmployeeName: salesEmployee.name,
      techSupportEmployeeId: techEmployee ? techEmployee._id : undefined,
      techSupportEmployeeName: techEmployee ? techEmployee.name : data.techSupportEmployeeName || '',
      dateTime: data.dateTime,
      issueReason: data.issueReason,
      status: 'PENDING',
    });

    if (data.leadId) {
      await Lead.findOneAndUpdate(
        { companyId, _id: data.leadId },
        { techSupportStatus: 'PENDING' }
      );
    }

    emitCompanyEvent('support:created', record);
    return record;
  }

  static async accept(companyId: string, employeeId: string, id: string) {
    const employee = await Employee.findOne({ companyId, _id: employeeId, isSuspended: false });
    if (!employee) throw { statusCode: 404, message: 'Tech support employee not found.' };

    const record = await RemoteSupport.findOneAndUpdate(
      {
        companyId,
        _id: id,
        status: 'PENDING',
        $or: [
          { techSupportEmployeeId: null },
          { techSupportEmployeeId: { $exists: false } },
          { techSupportEmployeeId: employee._id }
        ]
      },
      {
        status: 'IN_PROGRESS',
        techSupportEmployeeId: employee._id,
        techSupportEmployeeName: employee.name,
        acceptedAt: new Date(),
      },
      { new: true, runValidators: true }
    );

    if (!record) {
      throw { statusCode: 409, message: 'This support request has already been accepted or assigned to another employee.' };
    }

    if (record.leadId) {
      await Lead.findOneAndUpdate(
        { companyId, _id: record.leadId },
        {
          techSupportStatus: 'ACCEPTED',
          techSupportEmployeeId: employee._id,
          techSupportEmployeeName: employee.name,
        }
      );
    }

    emitCompanyEvent('support:accepted', record);
    return record;
  }

  static async reject(companyId: string, employeeId: string, id: string, rejectedReason: string) {
    if (!rejectedReason || !rejectedReason.trim()) {
      throw { statusCode: 400, message: 'Rejection reason is required.' };
    }
    const employee = await Employee.findOne({ companyId, _id: employeeId });

    const record = await RemoteSupport.findOne({ companyId, _id: id });
    if (!record) throw { statusCode: 404, message: 'Remote support record not found.' };

    record.status = 'REJECTED';
    record.rejectedReason = rejectedReason.trim();
    record.rejectedBy = new Types.ObjectId(employeeId);
    record.rejectedByName = employee?.name || 'Tech Support';
    record.rejectedAt = new Date();
    if (!record.techSupportEmployeeId) {
      record.techSupportEmployeeId = new Types.ObjectId(employeeId);
      record.techSupportEmployeeName = employee?.name || 'Tech Support';
    }
    await record.save();

    if (record.leadId) {
      await Lead.findOneAndUpdate(
        { companyId, _id: record.leadId },
        {
          status: 'COMPLETED',
          completionReason: record.rejectedReason,
          techSupportStatus: 'FAILED',
        },
        { new: true }
      );
    }

    emitCompanyEvent('support:rejected', record);
    return record;
  }

  static async complete(companyId: string, employeeId: string, id: string, data: { status: 'SUCCESSFUL' | 'FAILED'; failedReason?: string }) {
    const record = await RemoteSupport.findOne({ companyId, _id: id });
    if (!record) throw { statusCode: 404, message: 'Remote support record not found.' };

    const employee = await Employee.findOne({ companyId, _id: employeeId });

    if (data.status === 'SUCCESSFUL') {
      record.status = 'SUCCESSFUL';
      record.completedAt = new Date();
      if (!record.techSupportEmployeeId) {
        record.techSupportEmployeeId = new Types.ObjectId(employeeId);
        record.techSupportEmployeeName = employee?.name || 'Tech Support';
      }

      if (record.leadId) {
        await Lead.findOneAndUpdate(
          { companyId, _id: record.leadId },
          {
            techSupportStatus: 'SUCCESSFUL',
            techSupportCompletedAt: new Date(),
            techSupportEmployeeId: record.techSupportEmployeeId,
            techSupportEmployeeName: record.techSupportEmployeeName,
          }
        );
      }

      const sale = record.saleId ? await (await import('../models/Sale.js')).Sale.findOne({ companyId, _id: record.saleId }) : null;
      if (sale) {
        sale.verificationStatus = 'PENDING';
        sale.feedbackStatus = 'PENDING';
        if (!sale.verificationEmployeeId) {
          const verificationEmployee = await Employee.findOne({ companyId, role: 'VERIFICATION', isSuspended: false }).sort({ createdAt: 1 }).select('_id name');
          if (verificationEmployee) {
            sale.verificationEmployeeId = verificationEmployee._id;
            sale.verificationEmployeeName = verificationEmployee.name;
          }
        }
        await sale.save();
      }

      if (record.upgradeId) {
        const { Upgrade } = await import('../models/Upgrade.js');
        await Upgrade.findOneAndUpdate(
          { companyId, _id: record.upgradeId },
          {
            techSupportStatus: 'SUCCESSFUL',
            verificationStatus: 'PENDING',
            status: 'PENDING',
          }
        );
      }

      emitCompanyEvent('support:completed', record);
    } else if (data.status === 'FAILED') {
      if (!data.failedReason || !data.failedReason.trim()) {
        throw { statusCode: 400, message: 'Failure reason is required when marking support as failed.' };
      }
      record.status = 'FAILED';
      record.failedReason = data.failedReason.trim();
      record.failedBy = new Types.ObjectId(employeeId);
      record.failedByName = employee?.name || 'Tech Support';
      record.failedAt = new Date();
      if (!record.techSupportEmployeeId) {
        record.techSupportEmployeeId = new Types.ObjectId(employeeId);
        record.techSupportEmployeeName = employee?.name || 'Tech Support';
      }

      if (record.leadId) {
        await Lead.findOneAndUpdate(
          { companyId, _id: record.leadId },
          {
            status: 'COMPLETED',
            completionReason: record.failedReason,
            techSupportStatus: 'FAILED',
            techSupportEmployeeId: record.techSupportEmployeeId,
            techSupportEmployeeName: record.techSupportEmployeeName,
          },
          { new: true }
        );
      }

      if (record.upgradeId) {
        const { Upgrade } = await import('../models/Upgrade.js');
        await Upgrade.findOneAndUpdate(
          { companyId, _id: record.upgradeId },
          {
            techSupportStatus: 'FAILED',
            verificationStatus: 'FAILED',
            status: 'FAILED',
          }
        );
      }

      emitCompanyEvent('support:failed', record);
    }

    await record.save();
    return record;
  }

  static async assign(companyId: string, id: string, techSupportEmployeeId: string) {
    const techEmployee = await Employee.findOne({ companyId, _id: techSupportEmployeeId, isSuspended: false });
    if (!techEmployee) throw { statusCode: 404, message: 'Tech support employee not found.' };

    const record = await RemoteSupport.findOneAndUpdate(
      { companyId, _id: id },
      {
        techSupportEmployeeId: techEmployee._id,
        techSupportEmployeeName: techEmployee.name,
        status: 'IN_PROGRESS',
        acceptedAt: new Date(),
      },
      { new: true, runValidators: true }
    );
    if (!record) throw { statusCode: 404, message: 'Remote support record not found.' };

    if (record.leadId) {
      await Lead.findOneAndUpdate(
        { companyId, _id: record.leadId },
        {
          techSupportStatus: 'ACCEPTED',
          techSupportEmployeeId: techEmployee._id,
          techSupportEmployeeName: techEmployee.name,
        }
      );
    }

    emitCompanyEvent('support:assigned', record);
    return record;
  }

  static async update(companyId: string, role: Roles, employeeId: string, id: string, data: {
    status?: 'PENDING' | 'IN_PROGRESS' | 'SUCCESSFUL' | 'FAILED' | 'REJECTED';
    techSupportEmployeeId?: string;
    failedReason?: string;
    rejectedReason?: string;
  }) {
    const record = await RemoteSupport.findOne({ companyId, _id: id });
    if (!record) throw { statusCode: 404, message: 'Remote support record not found.' };

    if (role === Roles.TECH_SUPPORT) {
      if (record.techSupportEmployeeId && record.techSupportEmployeeId.toString() !== employeeId && record.status !== 'PENDING') {
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
      record.rejectedReason = '';
      record.failedBy = new Types.ObjectId(employeeId);
      const failingEmployee = await Employee.findOne({ companyId, _id: employeeId });
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
      record.rejectedBy = new Types.ObjectId(employeeId);
      const rejectingEmployee = await Employee.findOne({ companyId, _id: employeeId });
      record.rejectedByName = rejectingEmployee?.name || 'Unknown';
      record.rejectedAt = new Date();
      record.failedBy = undefined;
      record.failedByName = '';
      record.failedAt = undefined;
    }

    await record.save();

    if ((data.status === 'FAILED' || data.status === 'REJECTED') && record.leadId) {
      await Lead.findOneAndUpdate(
        { companyId, _id: record.leadId },
        {
          status: 'COMPLETED',
          completionReason: data.status === 'FAILED' ? record.failedReason : record.rejectedReason,
          techSupportStatus: 'FAILED',
        },
        { new: true, runValidators: true }
      );
    } else if (data.status === 'SUCCESSFUL' && record.leadId) {
      await Lead.findOneAndUpdate(
        { companyId, _id: record.leadId },
        {
          techSupportStatus: 'SUCCESSFUL',
          techSupportCompletedAt: new Date(),
        }
      );
    }

    emitCompanyEvent('support:updated', record);
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
    emitCompanyEvent('support:updated', { id, deleted: true });
    return;
  }

  static async summarize(companyId: string, role: Roles, employeeId: string) {
    const query: any = { companyId };
    if (role === Roles.TECH_SUPPORT) {
      query.$or = [
        { techSupportEmployeeId: new Types.ObjectId(employeeId) },
        { status: 'PENDING', techSupportEmployeeId: null },
        { status: 'PENDING', techSupportEmployeeId: { $exists: false } }
      ];
    } else if (role === Roles.SALES) {
      query.salesEmployeeId = new Types.ObjectId(employeeId);
    }

    const total = await RemoteSupport.countDocuments(query);
    const successful = await RemoteSupport.countDocuments({ ...query, status: 'SUCCESSFUL' });
    const failed = await RemoteSupport.countDocuments({ ...query, status: 'FAILED' });
    const pending = await RemoteSupport.countDocuments({ ...query, status: 'PENDING' });
    const inProgress = await RemoteSupport.countDocuments({ ...query, status: 'IN_PROGRESS' });
    const recent = await RemoteSupport.find(query).sort({ dateTime: -1 }).limit(5);
    return { total, successful, failed, pending, inProgress, successRate: total ? Math.round((successful / total) * 100) : 0, recent };
  }
}
