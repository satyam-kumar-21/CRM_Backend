import { Lead, ILead } from '../models/Lead';
import { Sale, ISale } from '../models/Sale';
import { Employee } from '../models/Employee';
import { getNextCustomerId } from '../models/Counter';
import { Roles } from '../constants/index';
import { getBusinessDateString, getBusinessDayRange } from '../utils/businessDate';
import { emitCompanyEvent } from '../realtime/socket';
import { Types } from 'mongoose';

type LeadInput = Omit<Partial<ILead>, 'companyId'> & {
  name: string;
  country: string;
  system: string;
  contactNo: string;
  customerEmail?: string;
  alternateContactNo?: string;
  customerAddress?: string;
  issues?: string;
  plan?: string;
  paymentMerchant?: string;
  connected?: 'yes' | 'no';
  connectedBy?: string;
  assignedTo?: string;
  assignedToName?: string;
  isSale?: 'yes' | 'no';
  saleAmount?: number;
  salePaymentMethod?: ILead['salePaymentMethod'];
  paymentConfirmed?: 'yes' | 'no';
  finalStatus?: 'PENDING_PAYMENT' | 'CLOSED' | 'PAYMENT_FAILED';
  status?: 'OPEN' | 'COMPLETED';
  completionReason?: string;
  workflowMessageId?: string;
};

type SaleInput = Omit<Partial<ISale>, 'companyId'> & {
  name: string;
  country: string;
  system: string;
  connectedBy: string;
  customerId?: string;
  customerEmail?: string;
  alternateContactNo?: string;
  customerAddress?: string;
  issues?: string;
  plan?: string;
  paymentMerchant?: string;
  salesEmployeeId?: string;
  salesEmployeeName?: string;
  techSupportEmployeeId?: string;
  techSupportEmployeeName?: string;
  techSupportCompletedAt?: Date;
  amount: number;
  paymentMethod: ISale['paymentMethod'];
  saleDate?: string;
  leadId?: string;
};

export class CompanySalesService {
  static async getLeads(companyId: string, role: string, employeeId: string) {
    if (role === Roles.COMPANY_ADMIN) {
      return Lead.find({ companyId }).sort({ createdAt: -1 });
    }
    const employee = await Employee.findOne({ companyId, _id: employeeId }).select('name employeeId teamId');
    if (!employee) return [];

    if (role === Roles.SALES) {
      return Lead.find({
        companyId,
        $or: [
          { assignedTo: new Types.ObjectId(employeeId) },
          { connectedBy: employee.name },
          { connectedBy: employee.employeeId },
        ],
      }).sort({ createdAt: -1 });
    }

    if (role === Roles.MANAGER && employee.teamId) {
      const teamEmployees = await Employee.find({ companyId, teamId: employee.teamId }).select('_id name employeeId');
      const teamIds = teamEmployees.map((e) => e._id);
      const teamNames = teamEmployees.map((e) => e.name);
      return Lead.find({
        companyId,
        $or: [
          { assignedTo: { $in: teamIds } },
          { connectedBy: { $in: teamNames } },
        ],
      }).sort({ createdAt: -1 });
    }

    return Lead.find({ companyId }).sort({ createdAt: -1 });
  }

  static async createLead(companyId: string, data: LeadInput) {
    if (data.workflowMessageId) {
      const existingLead = await Lead.findOne({ companyId, workflowMessageId: data.workflowMessageId });
      if (existingLead) return existingLead;
    }
    const lead = await Lead.create({
      ...data,
      connected: data.connected || 'no',
      connectedBy: data.connectedBy || '',
      isSale: data.isSale || 'no',
      status: data.status || 'OPEN',
      completionReason: data.completionReason || '',
      companyId,
    });
    emitCompanyEvent('lead:created', lead);
    return lead;
  }

  static async acceptLead(companyId: string, leadId: string, employeeId: string, employeeName: string) {
    const lead = await Lead.findOne({ companyId, _id: leadId });
    if (!lead) throw { statusCode: 404, message: 'Lead not found.' };

    lead.assignedTo = new Types.ObjectId(employeeId);
    lead.assignedToName = employeeName;
    lead.connectedBy = employeeName;
    lead.acceptedAt = new Date();
    await lead.save();

    emitCompanyEvent('lead:accepted', lead);
    return lead;
  }

  static async updateLead(companyId: string, id: string, data: Partial<LeadInput>, role?: string, employeeId?: string) {
    const existing = await Lead.findOne({ companyId, _id: id });
    if (!existing) throw { statusCode: 404, message: 'Lead not found.' };

    // Backend Permission Enforcement for Sales
    if (role === Roles.SALES && employeeId) {
      const employee = await Employee.findOne({ companyId, _id: employeeId }).select('name employeeId');
      const isAssigned =
        (existing.assignedTo && existing.assignedTo.toString() === employeeId) ||
        (employee && (existing.connectedBy === employee.name || existing.connectedBy === employee.employeeId));

      if (!isAssigned) {
        throw { statusCode: 403, message: 'Not authorized to update this Lead. Leads can only be updated by their assigned Sales employee.' };
      }
    }

    // If finalStatus is being set to CLOSED — auto create sale record
    if (data.finalStatus === 'CLOSED') {
      const lead = await Lead.findOneAndUpdate(
        { companyId, _id: id },
        { ...data, status: 'COMPLETED', isSale: 'yes', paymentConfirmed: 'yes' },
        { new: true, runValidators: true }
      );
      if (!lead) throw { statusCode: 404, message: 'Lead not found.' };

      // Auto-create Sale record if not already created
      const existingSale = await Sale.findOne({ companyId, leadId: id });
      if (!existingSale) {
        const currentBDate = getBusinessDateString();
        const tomorrow = new Date();
        tomorrow.setDate(tomorrow.getDate() + 1);
        const nextBDate = getBusinessDateString(tomorrow);
        let salesEmpId = lead.assignedTo ? new Types.ObjectId(lead.assignedTo.toString()) : undefined;
        if (!salesEmpId && employeeId) salesEmpId = new Types.ObjectId(employeeId);
        const salesEmpName = lead.assignedToName || lead.connectedBy || 'Sales Employee';

        const customerId = await getNextCustomerId(companyId);

        const sale = await Sale.create({
          companyId,
          leadId: id,
          customerId,
          name: lead.name,
          customerEmail: data.customerEmail || lead.customerEmail || '',
          alternateContactNo: data.alternateContactNo || lead.alternateContactNo || '',
          customerAddress: data.customerAddress || lead.customerAddress || '',
          country: lead.country,
          system: lead.system,
          issues: data.issues || lead.issues || lead.otherDetails || '',
          plan: data.plan || lead.plan || '',
          paymentMerchant: data.paymentMerchant || lead.paymentMerchant || '',
          connectedBy: lead.connectedBy,
          salesEmployeeId: salesEmpId,
          salesEmployeeName: salesEmpName,
          techSupportEmployeeId: lead.techSupportEmployeeId,
          techSupportEmployeeName: lead.techSupportEmployeeName,
          techSupportCompletedAt: lead.techSupportCompletedAt,
          amount: (data.saleAmount !== undefined ? data.saleAmount : lead.saleAmount) || 0,
          paymentMethod: data.salePaymentMethod || lead.salePaymentMethod || 'Card',
          saleDate: currentBDate,
          businessDate: currentBDate,
          verificationStatus: 'PENDING',
          feedbackStatus: 'PENDING',
          feedbackBusinessDate: nextBDate,
        });
        emitCompanyEvent('sale:created', sale);
      }

      emitCompanyEvent('lead:updated', lead);
      return lead;
    }

    // If finalStatus is PAYMENT_FAILED — close lead as no sale
    if (data.finalStatus === 'PAYMENT_FAILED') {
      const lead = await Lead.findOneAndUpdate(
        { companyId, _id: id },
        { ...data, status: 'COMPLETED', isSale: 'no', paymentConfirmed: 'no' },
        { new: true, runValidators: true }
      );
      if (!lead) throw { statusCode: 404, message: 'Lead not found.' };
      emitCompanyEvent('lead:updated', lead);
      return lead;
    }

    const lead = await Lead.findOneAndUpdate({ companyId, _id: id }, data, { new: true, runValidators: true });
    if (!lead) throw { statusCode: 404, message: 'Lead not found.' };

    emitCompanyEvent('lead:updated', lead);
    return lead;
  }

  static async deleteLead(companyId: string, id: string) {
    const result = await Lead.deleteOne({ companyId, _id: id });
    if (!result.deletedCount) throw { statusCode: 404, message: 'Lead not found.' };
    emitCompanyEvent('lead:deleted', { id });
    return { id };
  }

  static async getSales(companyId: string, role: string, employeeId: string, failed = false) {
    const statusQuery: any = failed
      ? { failed: true }
      : { $or: [{ failed: false }, { failed: { $exists: false } }] };

    if (role === Roles.COMPANY_ADMIN) {
      return Sale.find({ companyId, ...statusQuery }).sort({ createdAt: -1 });
    }

    const employee = await Employee.findOne({ companyId, _id: employeeId }).select('name employeeId teamId');
    if (!employee) return [];

    if (role === Roles.SALES) {
      return Sale.find({
        companyId,
        ...statusQuery,
        $or: [
          { salesEmployeeId: new Types.ObjectId(employeeId) },
          { connectedBy: employee.name },
          { connectedBy: employee.employeeId },
        ],
      }).sort({ createdAt: -1 });
    }

    if (role === Roles.MANAGER && employee.teamId) {
      const teamEmployees = await Employee.find({ companyId, teamId: employee.teamId }).select('_id name employeeId');
      const teamIds = teamEmployees.map((e) => e._id);
      const teamNames = teamEmployees.map((e) => e.name);
      return Sale.find({
        companyId,
        ...statusQuery,
        $or: [
          { salesEmployeeId: { $in: teamIds } },
          { connectedBy: { $in: teamNames } },
        ],
      }).sort({ createdAt: -1 });
    }

    return Sale.find({ companyId, ...statusQuery }).sort({ createdAt: -1 });
  }

  static async createSale(companyId: string, data: SaleInput, currentUserId?: string, currentUserName?: string) {
    if (data.leadId) {
      const existingSale = await Sale.findOne({ companyId, leadId: data.leadId });
      if (existingSale) return existingSale;
    }

    const currentBDate = getBusinessDateString();
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    const nextBDate = getBusinessDateString(tomorrow);

    let salesEmpId = data.salesEmployeeId ? new Types.ObjectId(data.salesEmployeeId) : undefined;
    let salesEmpName = data.salesEmployeeName || data.connectedBy;

    if (!salesEmpId && currentUserId) {
      salesEmpId = new Types.ObjectId(currentUserId);
    }
    if (!salesEmpName && currentUserName) {
      salesEmpName = currentUserName;
    }

    const customerId = data.customerId || (await getNextCustomerId(companyId));

    const sale = await Sale.create({
      ...data,
      companyId,
      customerId,
      salesEmployeeId: salesEmpId,
      salesEmployeeName: salesEmpName,
      saleDate: data.saleDate || currentBDate,
      businessDate: currentBDate,
      verificationStatus: 'PENDING',
      feedbackStatus: 'PENDING',
      feedbackBusinessDate: nextBDate,
    });

    if (data.leadId) {
      await Lead.findOneAndUpdate({ companyId, _id: data.leadId }, { isSale: 'yes', status: 'COMPLETED' });
    }

    emitCompanyEvent('sale:created', sale);
    return sale;
  }

  static async updateSale(companyId: string, id: string, data: Partial<SaleInput>) {
    const sale = await Sale.findOneAndUpdate({ companyId, _id: id }, data, { new: true, runValidators: true });
    if (!sale) throw { statusCode: 404, message: 'Sale not found.' };
    emitCompanyEvent('sale:updated', sale);
    return sale;
  }

  static async markSaleFailed(companyId: string, id: string, failedReason: string, failedById: string, failedByName: string) {
    if (!failedReason || !failedReason.trim()) throw { statusCode: 400, message: 'Failed reason is required.' };
    const sale = await Sale.findOneAndUpdate(
      { companyId, _id: id },
      {
        failed: true,
        failedReason: failedReason.trim(),
        failedAt: new Date(),
        failedBy: failedById,
        failedByName,
      },
      { new: true, runValidators: true }
    );
    if (!sale) throw { statusCode: 404, message: 'Sale not found.' };
    emitCompanyEvent('sale:updated', sale);
    return sale;
  }

  static async deleteSale(companyId: string, id: string) {
    const result = await Sale.deleteOne({ companyId, _id: id });
    if (!result.deletedCount) throw { statusCode: 404, message: 'Sale not found.' };
    emitCompanyEvent('sale:deleted', { id });
    return { id };
  }

  // Verification Methods
  static async getVerifications(companyId: string, role: string, employeeId: string, filters: { status?: string } = {}) {
    const query: any = { companyId, failed: { $ne: true } };
    if (filters.status) query.verificationStatus = filters.status;
    return Sale.find(query).sort({ createdAt: -1 });
  }

  static async startVerification(companyId: string, id: string) {
    const sale = await Sale.findOneAndUpdate(
      { companyId, _id: id },
      { verificationStatus: 'IN_PROGRESS' },
      { new: true, runValidators: true }
    );
    if (!sale) throw { statusCode: 404, message: 'Sale record not found.' };
    emitCompanyEvent('verification:updated', sale);
    return sale;
  }

  static async completeVerification(
    companyId: string,
    id: string,
    verifiedById: string,
    verifiedByName: string,
    data: { status: 'SUCCESSFUL' | 'FAILED'; notes?: string; failedReason?: string }
  ) {
    const sale = await Sale.findOne({ companyId, _id: id });
    if (!sale) throw { statusCode: 404, message: 'Sale record not found.' };

    if (data.status === 'SUCCESSFUL') {
      sale.verificationStatus = 'SUCCESSFUL';
      sale.verifiedBy = new Types.ObjectId(verifiedById);
      sale.verifiedByName = verifiedByName;
      sale.verifiedAt = new Date();
      sale.verificationNotes = data.notes || '';
    } else {
      if (!data.failedReason || !data.failedReason.trim()) {
        throw { statusCode: 400, message: 'Failure reason is required when marking verification as failed.' };
      }
      sale.verificationStatus = 'FAILED';
      sale.verificationFailedBy = new Types.ObjectId(verifiedById);
      sale.verificationFailedByName = verifiedByName;
      sale.verificationFailedReason = data.failedReason.trim();
      sale.verificationFailedAt = new Date();
    }

    await sale.save();
    emitCompanyEvent('verification:updated', sale);
    return sale;
  }

  // Feedback Methods
  static async getFeedbacks(companyId: string, role: string, employeeId: string, filters: { status?: string } = {}) {
    const currentBDate = getBusinessDateString();
    const query: any = {
      companyId,
      failed: { $ne: true },
      verificationStatus: 'SUCCESSFUL',
      $or: [
        { feedbackBusinessDate: { $lte: currentBDate } },
        { feedbackStatus: 'COMPLETED' }
      ]
    };
    if (filters.status) query.feedbackStatus = filters.status;
    return Sale.find(query).sort({ createdAt: -1 });
  }

  static async completeFeedback(
    companyId: string,
    id: string,
    feedbackById: string,
    feedbackByName: string,
    data: { rating: 'Positive' | 'Neutral' | 'Negative'; notes?: string }
  ) {
    if (!data.rating) throw { statusCode: 400, message: 'Feedback rating is required.' };
    const sale = await Sale.findOne({ companyId, _id: id });
    if (!sale) throw { statusCode: 404, message: 'Sale record not found.' };

    sale.feedbackStatus = 'COMPLETED';
    sale.feedbackRating = data.rating;
    sale.feedbackNotes = data.notes || '';
    sale.feedbackBy = new Types.ObjectId(feedbackById);
    sale.feedbackByName = feedbackByName;
    sale.feedbackAt = new Date();

    await sale.save();
    emitCompanyEvent('feedback:updated', sale);
    return sale;
  }

  // Today's Work Methods
  static async getTodaysWork(companyId: string, role: string, employeeId: string, employeeName: string) {
    const currentBDate = getBusinessDateString();

    if (role === Roles.SALES) {
      const leads = await Lead.find({
        companyId,
        $or: [{ assignedTo: new Types.ObjectId(employeeId) }, { connectedBy: employeeName }],
      }).sort({ createdAt: -1 });

      const sales = await Sale.find({
        companyId,
        $or: [{ salesEmployeeId: new Types.ObjectId(employeeId) }, { connectedBy: employeeName }],
        businessDate: currentBDate,
      }).sort({ createdAt: -1 });

      return { role, leads, sales, businessDate: currentBDate };
    }

    if (role === Roles.TECH_SUPPORT) {
      const RemoteSupport = (await import('../models/RemoteSupport.js')).RemoteSupport;
      const tickets = await RemoteSupport.find({
        companyId,
        $or: [
          { techSupportEmployeeId: new Types.ObjectId(employeeId) },
          { techSupportEmployeeName: employeeName },
          { status: 'PENDING' },
        ],
      }).sort({ createdAt: -1 });

      return { role, tickets, businessDate: currentBDate };
    }

    if (role === Roles.VERIFICATION) {
      const verifications = await Sale.find({
        companyId,
        failed: { $ne: true },
        $or: [
          { verificationStatus: { $in: ['PENDING', 'IN_PROGRESS'] } },
          { verifiedBy: new Types.ObjectId(feedbackByIdOrVerifiedById(employeeId)) },
        ],
      }).sort({ createdAt: -1 });

      const feedbacks = await Sale.find({
        companyId,
        failed: { $ne: true },
        verificationStatus: 'SUCCESSFUL',
        $or: [
          { feedbackBusinessDate: { $lte: currentBDate } },
          { feedbackStatus: 'COMPLETED' },
        ],
      }).sort({ createdAt: -1 });

      return { role, verifications, feedbacks, businessDate: currentBDate };
    }

    if (role === Roles.MANAGER || role === Roles.COMPANY_ADMIN) {
      const leads = await Lead.find({ companyId }).sort({ createdAt: -1 });
      const sales = await Sale.find({ companyId, businessDate: currentBDate }).sort({ createdAt: -1 });
      const RemoteSupport = (await import('../models/RemoteSupport.js')).RemoteSupport;
      const tickets = await RemoteSupport.find({ companyId }).sort({ createdAt: -1 });

      return { role, leads, sales, tickets, businessDate: currentBDate };
    }

    return { role, businessDate: currentBDate };
  }
}

function feedbackByIdOrVerifiedById(id: string) {
  try {
    return new Types.ObjectId(id);
  } catch (e) {
    return undefined;
  }
}
