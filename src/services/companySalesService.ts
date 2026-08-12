import { Lead, ILead } from '../models/Lead';
import { Sale, ISale } from '../models/Sale';
import { Employee } from '../models/Employee';
import { getBusinessDateString } from '../utils/businessDate';

type LeadInput = Omit<Partial<ILead>, 'companyId'> & {
  name: string;
  country: string;
  system: string;
  contactNo: string;
  connected: 'yes' | 'no';
  connectedBy: string;
  isSale: 'yes' | 'no';
  status?: 'OPEN' | 'COMPLETED';
  completionReason?: string;
  workflowMessageId?: string;
};

type SaleInput = Omit<Partial<ISale>, 'companyId'> & {
  name: string;
  country: string;
  system: string;
  connectedBy: string;
  amount: number;
  paymentMethod: ISale['paymentMethod'];
  saleDate: string;
};

export class CompanySalesService {
  private static async syncConvertedSale(companyId: string, lead: ILead) {
    if (lead.isSale !== 'yes') return;
    const saleData = {
      name: lead.name,
      country: lead.country,
      system: lead.system,
      connectedBy: lead.connectedBy,
    };
    const existingSale = await Sale.findOne({ companyId, leadId: lead._id });
    if (existingSale) {
      await Sale.updateOne({ _id: existingSale._id }, saleData);
      return;
    }
    await Sale.create({
      ...saleData,
      companyId,
      leadId: lead._id,
      amount: 0,
      paymentMethod: 'Other',
      saleDate: getBusinessDateString(),
    });
  }

  static async getLeads(companyId: string, employeeId?: string) {
    if (!employeeId) return Lead.find({ companyId }).sort({ createdAt: -1 });
    const employee = await Employee.findOne({ companyId, _id: employeeId }).select('name employeeId');
    if (!employee) return [];
    return Lead.find({ companyId, $or: [{ connectedBy: employee.name }, { connectedBy: employee.employeeId }] }).sort({ createdAt: -1 });
  }

  static async createLead(companyId: string, data: LeadInput) {
    if (data.workflowMessageId) {
      const existingLead = await Lead.findOne({ companyId, workflowMessageId: data.workflowMessageId });
      if (existingLead) return existingLead;
    }
    const lead = await Lead.create({ ...data, status: data.status || 'OPEN', completionReason: data.completionReason || '', companyId });
    await this.syncConvertedSale(companyId, lead);
    return lead;
  }

  static async updateLead(companyId: string, id: string, data: Partial<LeadInput>) {
    const lead = await Lead.findOneAndUpdate({ companyId, _id: id }, data, { new: true, runValidators: true });
    if (!lead) throw { statusCode: 404, message: 'Lead not found.' };
    await this.syncConvertedSale(companyId, lead);
    return lead;
  }

  static async deleteLead(companyId: string, id: string) {
    const result = await Lead.deleteOne({ companyId, _id: id });
    if (!result.deletedCount) throw { statusCode: 404, message: 'Lead not found.' };
    return { id };
  }

  static async getSales(companyId: string, employeeId?: string, failed = false) {
    const statusQuery: any = failed
      ? { failed: true }
      : { $or: [{ failed: false }, { failed: { $exists: false } }] };

    if (!employeeId) return Sale.find({ companyId, ...statusQuery }).sort({ saleDate: -1, createdAt: -1 });
    const employee = await Employee.findOne({ companyId, _id: employeeId }).select('name employeeId');
    if (!employee) return [];
    return Sale.find({
      companyId,
      ...statusQuery,
      $or: [{ connectedBy: employee.name }, { connectedBy: employee.employeeId }],
    }).sort({ saleDate: -1, createdAt: -1 });
  }

  static async createSale(companyId: string, data: SaleInput) {
    if (data.leadId) {
      const existingSale = await Sale.findOne({ companyId, leadId: data.leadId });
      if (existingSale) return existingSale;
    }
    return Sale.create({ ...data, companyId });
  }

  static async updateSale(companyId: string, id: string, data: Partial<SaleInput>) {
    const sale = await Sale.findOneAndUpdate({ companyId, _id: id }, data, { new: true, runValidators: true });
    if (!sale) throw { statusCode: 404, message: 'Sale not found.' };
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
    return sale;
  }

  static async deleteSale(companyId: string, id: string) {
    const result = await Sale.deleteOne({ companyId, _id: id });
    if (!result.deletedCount) throw { statusCode: 404, message: 'Sale not found.' };
    return { id };
  }
}
