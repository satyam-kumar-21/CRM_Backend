import { Lead, ILead } from '../models/Lead';
import { Sale, ISale } from '../models/Sale';

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
  static getLeads(companyId: string) {
    return Lead.find({ companyId }).sort({ createdAt: -1 });
  }

  static createLead(companyId: string, data: LeadInput) {
    return Lead.create({ ...data, companyId });
  }

  static async updateLead(companyId: string, id: string, data: Partial<LeadInput>) {
    const lead = await Lead.findOneAndUpdate({ companyId, _id: id }, data, { new: true, runValidators: true });
    if (!lead) throw { statusCode: 404, message: 'Lead not found.' };
    return lead;
  }

  static async deleteLead(companyId: string, id: string) {
    const result = await Lead.deleteOne({ companyId, _id: id });
    if (!result.deletedCount) throw { statusCode: 404, message: 'Lead not found.' };
    return { id };
  }

  static getSales(companyId: string) {
    return Sale.find({ companyId }).sort({ saleDate: -1, createdAt: -1 });
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
