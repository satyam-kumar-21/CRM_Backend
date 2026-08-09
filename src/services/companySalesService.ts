import { Lead, ILead } from '../models/Lead';
import { Sale, ISale } from '../models/Sale';
import { Employee } from '../models/Employee';

type LeadInput = Omit<Partial<ILead>, 'companyId'> & {
  name: string;
  country: string;
  system: string;
  contactNo: string;
  connected: 'yes' | 'no';
  connectedBy: string;
  isSale: 'yes' | 'no';
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
      saleDate: new Date().toISOString().slice(0, 10),
    });
  }

  static async getLeads(companyId: string, employeeId?: string) {
    if (!employeeId) return Lead.find({ companyId }).sort({ createdAt: -1 });
    const employee = await Employee.findOne({ companyId, _id: employeeId }).select('name employeeId');
    if (!employee) return [];
    return Lead.find({ companyId, $or: [{ connectedBy: employee.name }, { connectedBy: employee.employeeId }] }).sort({ createdAt: -1 });
  }

  static async createLead(companyId: string, data: LeadInput) {
    const lead = await Lead.create({ ...data, companyId });
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

  static async getSales(companyId: string, employeeId?: string) {
    if (!employeeId) return Sale.find({ companyId }).sort({ saleDate: -1, createdAt: -1 });
    const employee = await Employee.findOne({ companyId, _id: employeeId }).select('name employeeId');
    if (!employee) return [];
    return Sale.find({ companyId, $or: [{ connectedBy: employee.name }, { connectedBy: employee.employeeId }] }).sort({ saleDate: -1, createdAt: -1 });
  }

  static createSale(companyId: string, data: SaleInput) {
    return Sale.create({ ...data, companyId });
  }

  static async updateSale(companyId: string, id: string, data: Partial<SaleInput>) {
    const sale = await Sale.findOneAndUpdate({ companyId, _id: id }, data, { new: true, runValidators: true });
    if (!sale) throw { statusCode: 404, message: 'Sale not found.' };
    return sale;
  }

  static async deleteSale(companyId: string, id: string) {
    const result = await Sale.deleteOne({ companyId, _id: id });
    if (!result.deletedCount) throw { statusCode: 404, message: 'Sale not found.' };
    return { id };
  }
}
