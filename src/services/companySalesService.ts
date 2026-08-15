import { Lead, ILead } from '../models/Lead';
import { Sale, ISale } from '../models/Sale';
import { Upgrade, IUpgrade } from '../models/Upgrade';
import { RemoteSupport } from '../models/RemoteSupport';
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
  customerType?: 'NEW' | 'EXISTING_CUSTOMER' | 'UPGRADE';
  isSale?: 'yes' | 'no';
  saleAmount?: number;
  mainAmount?: number;
  upgradedAmount?: number;
  salesTaxType?: 'PERCENTAGE' | 'DIRECT_AMOUNT';
  salesTaxValue?: number;
  salesTaxAmount?: number;
  finalAmount?: number;
  salePaymentMethod?: ILead['salePaymentMethod'];
  paymentConfirmed?: 'yes' | 'no';
  finalStatus?: 'PENDING_PAYMENT' | 'CLOSED' | 'PAYMENT_FAILED';
  status?: 'OPEN' | 'COMPLETED';
  completionReason?: string;
  salesEmployeeRemark?: string;
  workflowMessageId?: string;
};

type SaleInput = Omit<Partial<ISale>, 'companyId'> & {
  name: string;
  country: string;
  system: string;
  connectedBy: string;
  customerId?: string;
  customerEmail?: string;
  customerType?: 'NEW' | 'EXISTING_CUSTOMER' | 'UPGRADE';
  mainAmount?: number;
  upgradedAmount?: number;
  salesTaxType?: 'PERCENTAGE' | 'DIRECT_AMOUNT';
  salesTaxValue?: number;
  salesTaxAmount?: number;
  finalAmount?: number;
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
  salesEmployeeRemark?: string;
};

export class CompanySalesService {
  private static async assignVerificationEmployeeIfMissing(companyId: string, saleId: string, employeeId: string, employeeName: string) {
    const sale = await Sale.findOne({ companyId, _id: saleId, failed: { $ne: true } });
    if (!sale) return;
    if (!sale.verificationEmployeeId) {
      sale.verificationEmployeeId = new Types.ObjectId(employeeId);
      sale.verificationEmployeeName = employeeName || sale.verificationEmployeeName || 'Verification Employee';
      await sale.save();
    }
  }

  private static async assignVerificationEmployeeForSale(companyId: string, sale: ISale) {
    if (sale.failed === true || sale.verificationEmployeeId) return sale;

    const verificationEmployee = await Employee.findOne({
      companyId,
      role: Roles.VERIFICATION,
      isSuspended: false,
    }).sort({ createdAt: 1 }).select('_id name');

    if (!verificationEmployee) return sale;

    sale.verificationEmployeeId = verificationEmployee._id;
    sale.verificationEmployeeName = verificationEmployee.name;
    await sale.save();
    return sale;
  }

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
      customerType: data.customerType || 'NEW',
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
        const salesEmployeeRemark = (data.salesEmployeeRemark ?? lead.salesEmployeeRemark ?? '').trim();
        const finalSaleAmount = Number(data.finalAmount ?? data.saleAmount ?? lead.saleAmount ?? 0);
        const mainAmount = Number(data.mainAmount ?? 0);
        const upgradedAmount = Number(data.upgradedAmount ?? 0);
        const salesTaxType = data.salesTaxType || 'PERCENTAGE';
        const salesTaxValue = Number(data.salesTaxValue ?? 0);
        const salesTaxAmount = Number(data.salesTaxAmount ?? (salesTaxType === 'PERCENTAGE' ? ((mainAmount + upgradedAmount) * salesTaxValue) / 100 : salesTaxValue));
        const computedFinalAmount = Number(data.finalAmount ?? ((mainAmount + upgradedAmount + salesTaxAmount) || finalSaleAmount));

        const customerId = await getNextCustomerId(companyId);

        const sale = await Sale.create({
          companyId,
          leadId: id,
          customerId,
          name: data.name || lead.name,
          customerEmail: data.customerEmail || lead.customerEmail || '',
          alternateContactNo: data.alternateContactNo || lead.alternateContactNo || '',
          customerAddress: data.customerAddress || lead.customerAddress || '',
          country: lead.country,
          system: lead.system,
          issues: data.issues || lead.issues || lead.otherDetails || '',
          plan: data.plan || lead.plan || '',
          paymentMerchant: data.paymentMerchant || lead.paymentMerchant || '',
          connectedBy: lead.connectedBy,
          customerType: data.customerType || lead.customerType || 'NEW',
          salesEmployeeId: salesEmpId,
          salesEmployeeName: salesEmpName,
          techSupportEmployeeId: lead.techSupportEmployeeId,
          techSupportEmployeeName: lead.techSupportEmployeeName,
          techSupportCompletedAt: lead.techSupportCompletedAt,
          amount: finalSaleAmount || computedFinalAmount || 0,
          mainAmount: mainAmount || 0,
          upgradedAmount: upgradedAmount || 0,
          salesTaxType,
          salesTaxValue,
          salesTaxAmount,
          finalAmount: computedFinalAmount || finalSaleAmount || 0,
          paymentMethod: data.salePaymentMethod || lead.salePaymentMethod || 'Card',
          saleDate: currentBDate,
          businessDate: currentBDate,
          salesEmployeeRemark,
        });

        await CompanySalesService.assignVerificationEmployeeForSale(companyId, sale);

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

    const salesEmployeeRemark = (data.salesEmployeeRemark || '').trim();
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

    const mainAmount = Number(data.mainAmount ?? 0);
    const upgradedAmount = Number(data.upgradedAmount ?? 0);
    const salesTaxType = data.salesTaxType || 'PERCENTAGE';
    const salesTaxValue = Number(data.salesTaxValue ?? 0);
    const salesTaxAmount = Number(data.salesTaxAmount ?? (salesTaxType === 'PERCENTAGE' ? ((mainAmount + upgradedAmount) * salesTaxValue) / 100 : salesTaxValue));
    const derivedFinalAmount = Number(mainAmount + upgradedAmount + salesTaxAmount || 0);
    const finalAmount = Number(data.finalAmount ?? (data.amount ?? derivedFinalAmount));
    const customerId = data.customerId || (await getNextCustomerId(companyId));

    const sale = await Sale.create({
      ...data,
      companyId,
      customerId,
      customerType: data.customerType || 'NEW',
      salesEmployeeId: salesEmpId,
      salesEmployeeName: salesEmpName,
      amount: Number(data.amount ?? finalAmount),
      mainAmount,
      upgradedAmount,
      salesTaxType,
      salesTaxValue,
      salesTaxAmount,
      finalAmount,
      saleDate: data.saleDate || currentBDate,
      businessDate: currentBDate,
      salesEmployeeRemark,
      verificationStatus: 'PENDING',
      feedbackStatus: 'PENDING',
      feedbackBusinessDate: nextBDate,
    });

    if (data.leadId) {
      await Lead.findOneAndUpdate({ companyId, _id: data.leadId }, { isSale: 'yes', status: 'COMPLETED' });
    }

    await CompanySalesService.assignVerificationEmployeeForSale(companyId, sale);
    emitCompanyEvent('sale:created', sale);
    return sale;
  }

  static async updateSale(companyId: string, id: string, data: Partial<SaleInput>) {
    const existing = await Sale.findOne({ companyId, _id: id });
    if (!existing) throw { statusCode: 404, message: 'Sale not found.' };

    const mainAmount = Number(data.mainAmount ?? existing.mainAmount ?? 0);
    const upgradedAmount = Number(data.upgradedAmount ?? existing.upgradedAmount ?? 0);
    const salesTaxType = data.salesTaxType || existing.salesTaxType || 'PERCENTAGE';
    const salesTaxValue = Number(data.salesTaxValue ?? existing.salesTaxValue ?? 0);
    const salesTaxAmount = Number(data.salesTaxAmount ?? (salesTaxType === 'PERCENTAGE' ? ((mainAmount + upgradedAmount) * salesTaxValue) / 100 : salesTaxValue));
    const derivedFinalAmount = Number(mainAmount + upgradedAmount + salesTaxAmount || existing.finalAmount || existing.amount || 0);
    const finalAmount = Number(data.finalAmount ?? derivedFinalAmount);

    const updated = await Sale.findOneAndUpdate(
      { companyId, _id: id },
      {
        ...data,
        salesEmployeeRemark: data.salesEmployeeRemark !== undefined ? data.salesEmployeeRemark.trim() : existing.salesEmployeeRemark || '',
        mainAmount,
        upgradedAmount,
        salesTaxType,
        salesTaxValue,
        salesTaxAmount,
        finalAmount,
        amount: Number(data.amount ?? finalAmount),
      },
      { new: true, runValidators: true }
    );
    if (!updated) throw { statusCode: 404, message: 'Sale not found.' };
    emitCompanyEvent('sale:updated', updated);
    return updated;
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

  static buildCustomerSearchFilters(search: string) {
    const trimmed = (search || '').trim();
    if (!trimmed) return [];

    const escaped = trimmed.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const regex = new RegExp(escaped, 'i');
    const conditions: any[] = [
      { name: regex },
      { customerEmail: regex },
      { customerId: regex },
      { alternateContactNo: regex },
      { country: regex },
      { system: regex },
      { plan: regex },
      { connectedBy: regex },
      { salesEmployeeName: regex },
    ];

    if (Types.ObjectId.isValid(trimmed)) {
      const objId = new Types.ObjectId(trimmed);
      conditions.push({ _id: objId });
      conditions.push({ leadId: objId });
    }

    return conditions;
  }

  static async searchCustomers(companyId: string, role: string, employeeId: string, q: string) {
    const search = (q || '').trim();
    if (!search) {
      if (role === Roles.SALES && employeeId && Types.ObjectId.isValid(employeeId)) {
        return Sale.find({ companyId, salesEmployeeId: new Types.ObjectId(employeeId) }).sort({ createdAt: -1 }).limit(50);
      }
      return Sale.find({ companyId }).sort({ createdAt: -1 }).limit(50);
    }

    const searchFilters = CompanySalesService.buildCustomerSearchFilters(search);
    if (!searchFilters.length) return [];

    return Sale.find({ companyId, $or: searchFilters }).sort({ createdAt: -1 }).limit(100);
  }

  static async createUpgrade(companyId: string, data: Partial<SaleInput> & { customerId?: string; upgradeAmount?: number; salesTaxType?: 'PERCENTAGE' | 'DIRECT_AMOUNT'; salesTaxValue?: number; salesTaxAmount?: number; finalAmount?: number; paymentMethod?: ISale['paymentMethod']; salesEmployeeRemark?: string; upgradedBy?: string; customerName?: string; customerEmail?: string; mobile?: string; country?: string; system?: string; needsTechSupport?: 'yes' | 'no' | boolean; }, currentUserId?: string, currentUserName?: string) {
    const customerId = data.customerId || (await getNextCustomerId(companyId));
    const upgradeAmount = Number(data.upgradeAmount ?? data.amount ?? 0);
    const salesTaxType = data.salesTaxType || 'PERCENTAGE';
    const salesTaxValue = Number(data.salesTaxValue ?? 0);
    const salesTaxAmount = Number(data.salesTaxAmount ?? (salesTaxType === 'PERCENTAGE' ? (upgradeAmount * salesTaxValue) / 100 : salesTaxValue));
    const finalAmount = Number(data.finalAmount ?? (upgradeAmount + salesTaxAmount));
    const saleForUpgrade = await Sale.findOne({ companyId, customerId }).sort({ createdAt: -1 });
    const existingUpgrades = await Upgrade.countDocuments({ companyId, customerId });

    const validCurrentUserId = currentUserId && Types.ObjectId.isValid(currentUserId) ? new Types.ObjectId(currentUserId) : undefined;
    const currentBDate = getBusinessDateString();
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    const nextBDate = getBusinessDateString(tomorrow);
    const hasTechSupport = data.needsTechSupport === 'yes' || data.needsTechSupport === true;

    const upgrade = await Upgrade.create({
      companyId,
      customerId,
      customerName: data.customerName || saleForUpgrade?.name || 'Customer',
      customerEmail: data.customerEmail || saleForUpgrade?.customerEmail || '',
      mobile: data.mobile || saleForUpgrade?.alternateContactNo || '',
      country: data.country || saleForUpgrade?.country || '',
      system: data.system || saleForUpgrade?.system || '',
      salesEmployeeId: saleForUpgrade?.salesEmployeeId || validCurrentUserId,
      salesEmployeeName: saleForUpgrade?.salesEmployeeName || currentUserName || 'Sales Employee',
      upgradedBy: validCurrentUserId,
      upgradedByName: currentUserName || 'Sales Employee',
      originalSaleId: saleForUpgrade?._id,
      upgradeNumber: existingUpgrades + 1,
      upgradeAmount,
      salesTaxType,
      salesTaxValue,
      salesTaxAmount,
      finalAmount,
      paymentMethod: data.paymentMethod || saleForUpgrade?.paymentMethod || 'Card',
      salesEmployeeRemark: (data.salesEmployeeRemark || '').trim(),
      status: 'PENDING',
      techSupportStatus: hasTechSupport ? 'PENDING' : 'NONE',
      verificationStatus: 'PENDING',
      feedbackStatus: 'PENDING',
    });

    if (hasTechSupport) {
      const rsTicket = await RemoteSupport.create({
        companyId,
        customerName: data.customerName || saleForUpgrade?.name || 'Customer',
        customerContact: data.mobile || saleForUpgrade?.alternateContactNo || '',
        country: data.country || saleForUpgrade?.country || '',
        system: data.system || saleForUpgrade?.system || '',
        otherDetails: `[Upgrade #${existingUpgrades + 1}] ${(data.salesEmployeeRemark || '').trim()}`,
        salesEmployeeId: validCurrentUserId || saleForUpgrade?.salesEmployeeId,
        salesEmployeeName: currentUserName || saleForUpgrade?.salesEmployeeName || 'Sales Employee',
        dateTime: new Date(),
        issueReason: (data.salesEmployeeRemark || '').trim() || 'Customer Upgrade Remote Support',
        status: 'PENDING',
      });
      emitCompanyEvent('remote-support:created', rsTicket);
    }

    const upgradeSale = await Sale.create({
      companyId,
      customerId,
      name: data.customerName || saleForUpgrade?.name || 'Customer',
      customerEmail: data.customerEmail || saleForUpgrade?.customerEmail || '',
      alternateContactNo: data.mobile || saleForUpgrade?.alternateContactNo || '',
      country: data.country || saleForUpgrade?.country || 'Unknown',
      system: data.system || saleForUpgrade?.system || 'N/A',
      plan: saleForUpgrade?.plan || '',
      issues: (data.salesEmployeeRemark || '').trim(),
      paymentMerchant: saleForUpgrade?.paymentMerchant || '',
      connectedBy: currentUserName || 'Sales Employee',
      customerType: 'UPGRADE',
      salesEmployeeId: validCurrentUserId || saleForUpgrade?.salesEmployeeId,
      salesEmployeeName: currentUserName || saleForUpgrade?.salesEmployeeName || 'Sales Employee',
      amount: upgradeAmount,
      mainAmount: saleForUpgrade?.amount || 0,
      upgradedAmount: upgradeAmount,
      salesTaxType,
      salesTaxValue,
      salesTaxAmount,
      finalAmount,
      paymentMethod: data.paymentMethod || saleForUpgrade?.paymentMethod || 'Card',
      saleDate: currentBDate,
      businessDate: currentBDate,
      salesEmployeeRemark: (data.salesEmployeeRemark || '').trim(),
      verificationStatus: 'PENDING',
      feedbackStatus: 'PENDING',
      feedbackBusinessDate: nextBDate,
    });

    await CompanySalesService.assignVerificationEmployeeForSale(companyId, upgradeSale);
    emitCompanyEvent('sale:created', upgradeSale);
    emitCompanyEvent('verification:updated', upgradeSale);
    emitCompanyEvent('upgrade:created', upgrade);

    return upgrade;
  }

  static async getUpgrades(companyId: string, role: string, employeeId: string, filters: { customerId?: string; status?: string; q?: string } = {}) {
    const query: any = { companyId };
    if (filters.customerId) query.customerId = filters.customerId;
    if (filters.status) query.status = filters.status;

    const andConditions: any[] = [];

    if (filters.q) {
      const q = new RegExp(filters.q.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i');
      andConditions.push({
        $or: [
          { customerName: q },
          { customerId: q },
          { customerEmail: q },
          { mobile: q },
          { salesEmployeeName: q },
          { upgradedByName: q },
        ],
      });
    }

    if (role === Roles.SALES && employeeId && Types.ObjectId.isValid(employeeId)) {
      const empObjectId = new Types.ObjectId(employeeId);
      andConditions.push({
        $or: [
          { salesEmployeeId: empObjectId },
          { upgradedBy: empObjectId },
        ],
      });
    }

    if (andConditions.length === 1) {
      Object.assign(query, andConditions[0]);
    } else if (andConditions.length > 1) {
      query.$and = andConditions;
    }

    return Upgrade.find(query).sort({ createdAt: -1 });
  }

  static async createVerification(companyId: string, data: Partial<SaleInput>, currentUserId?: string) {
    const currentBDate = getBusinessDateString();
    const amount = Number(data.amount ?? data.finalAmount ?? 0);
    const mainAmount = Number(data.mainAmount ?? amount);
    const upgradedAmount = Number(data.upgradedAmount ?? 0);
    const salesTaxType = data.salesTaxType || 'PERCENTAGE';
    const salesTaxValue = Number(data.salesTaxValue ?? 0);
    const salesTaxAmount = Number(data.salesTaxAmount ?? (salesTaxType === 'PERCENTAGE' ? ((mainAmount + upgradedAmount) * salesTaxValue) / 100 : salesTaxValue));
    const derivedFinalAmount = Number(mainAmount + upgradedAmount + salesTaxAmount || amount || 0);
    const finalAmount = Number(data.finalAmount ?? derivedFinalAmount);
    const sale = await Sale.create({
      ...data,
      companyId,
      name: data.name || 'Customer',
      country: data.country || 'Unknown',
      system: data.system || 'N/A',
      connectedBy: data.connectedBy || 'Admin',
      customerType: data.customerType || 'NEW',
      salesEmployeeId: data.salesEmployeeId ? new Types.ObjectId(data.salesEmployeeId) : currentUserId ? new Types.ObjectId(currentUserId) : undefined,
      salesEmployeeName: data.salesEmployeeName || data.connectedBy || 'Admin',
      amount,
      mainAmount,
      upgradedAmount,
      salesTaxType,
      salesTaxValue,
      salesTaxAmount,
      finalAmount,
      paymentMethod: data.paymentMethod || 'Card',
      saleDate: data.saleDate || currentBDate,
      businessDate: currentBDate,
      verificationStatus: data.verificationStatus || 'PENDING',
      feedbackStatus: 'PENDING',
    });
    emitCompanyEvent('verification:updated', sale);
    return sale;
  }

  static async updateVerification(companyId: string, id: string, data: Partial<SaleInput>) {
    const existing = await Sale.findOne({ companyId, _id: id });
    if (!existing) throw { statusCode: 404, message: 'Verification record not found.' };
    const mainAmount = Number(data.mainAmount ?? existing.mainAmount ?? existing.amount ?? 0);
    const upgradedAmount = Number(data.upgradedAmount ?? existing.upgradedAmount ?? 0);
    const salesTaxType = data.salesTaxType || existing.salesTaxType || 'PERCENTAGE';
    const salesTaxValue = Number(data.salesTaxValue ?? existing.salesTaxValue ?? 0);
    const salesTaxAmount = Number(data.salesTaxAmount ?? (salesTaxType === 'PERCENTAGE' ? ((mainAmount + upgradedAmount) * salesTaxValue) / 100 : salesTaxValue));
    const derivedFinalAmount = Number(mainAmount + upgradedAmount + salesTaxAmount || existing.finalAmount || existing.amount || 0);
    const finalAmount = Number(data.finalAmount ?? derivedFinalAmount);
    const updated = await Sale.findOneAndUpdate(
      { companyId, _id: id },
      {
        ...data,
        customerType: data.customerType || existing.customerType || 'NEW',
        amount: Number(data.amount ?? finalAmount),
        mainAmount,
        upgradedAmount,
        salesTaxType,
        salesTaxValue,
        salesTaxAmount,
        finalAmount,
      },
      { new: true, runValidators: true }
    );
    if (!updated) throw { statusCode: 404, message: 'Verification record not found.' };
    emitCompanyEvent('verification:updated', updated);
    return updated;
  }

  static async deleteVerification(companyId: string, id: string) {
    const result = await Sale.deleteOne({ companyId, _id: id });
    if (!result.deletedCount) throw { statusCode: 404, message: 'Verification record not found.' };
    emitCompanyEvent('verification:updated', { _id: id, companyId });
    return { id };
  }

  // Verification Methods
  static async getVerifications(companyId: string, role: string, employeeId: string, filters: { status?: string } = {}) {
    if (role === Roles.VERIFICATION) {
      const unassigned = await Sale.find({
        companyId,
        failed: { $ne: true },
        verificationStatus: { $in: ['PENDING', 'IN_PROGRESS'] },
        $or: [
          { verificationEmployeeId: { $exists: false } },
          { verificationEmployeeId: null },
        ],
      }).select('_id name');

      for (const sale of unassigned) {
        await CompanySalesService.assignVerificationEmployeeIfMissing(companyId, sale._id.toString(), employeeId, 'Verification Employee');
      }
    }

    const query: any = { companyId, failed: { $ne: true } };
    if (filters.status) query.verificationStatus = filters.status;
    if (role === Roles.VERIFICATION) {
      query.$or = [
        { verificationEmployeeId: new Types.ObjectId(employeeId) },
        { verificationEmployeeId: null },
        { verificationEmployeeId: { $exists: false } },
      ];
    }
    return Sale.find(query).sort({ createdAt: -1 });
  }

  static async startVerification(companyId: string, id: string, employeeId: string, employeeName: string) {
    const sale = await Sale.findOne({ companyId, _id: id });
    if (!sale) throw { statusCode: 404, message: 'Sale record not found.' };
    sale.verificationStatus = 'IN_PROGRESS';
    sale.verificationEmployeeId = sale.verificationEmployeeId || new Types.ObjectId(employeeId);
    sale.verificationEmployeeName = sale.verificationEmployeeName || employeeName;
    await sale.save();
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

    if (role === Roles.VERIFICATION || role === Roles.FEEDBACK) {
      query.$and = [
        {
          $or: [
            { verificationEmployeeId: new Types.ObjectId(employeeId) },
            { verificationEmployeeId: null },
            { verificationEmployeeId: { $exists: false } },
          ],
        },
      ];
    }

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
      const unassigned = await Sale.find({
        companyId,
        failed: { $ne: true },
        verificationStatus: { $in: ['PENDING', 'IN_PROGRESS'] },
        $or: [
          { verificationEmployeeId: { $exists: false } },
          { verificationEmployeeId: null },
        ],
      }).select('_id');

      for (const sale of unassigned) {
        await CompanySalesService.assignVerificationEmployeeIfMissing(companyId, sale._id.toString(), employeeId, employeeName);
      }

      const verifications = await Sale.find({
        companyId,
        failed: { $ne: true },
        $and: [
          {
            $or: [
              { verificationEmployeeId: new Types.ObjectId(employeeId) },
              { verificationEmployeeId: null },
              { verificationEmployeeId: { $exists: false } },
            ],
          },
          {
            $or: [
              { verificationStatus: { $in: ['PENDING', 'IN_PROGRESS'] } },
              { verifiedBy: new Types.ObjectId(feedbackByIdOrVerifiedById(employeeId)) },
            ],
          },
        ],
      }).sort({ createdAt: -1 });

      const feedbacks = await Sale.find({
        companyId,
        failed: { $ne: true },
        verificationStatus: 'SUCCESSFUL',
        $and: [
          {
            $or: [
              { verificationEmployeeId: new Types.ObjectId(employeeId) },
              { verificationEmployeeId: null },
              { verificationEmployeeId: { $exists: false } },
            ],
          },
          {
            $or: [
              { feedbackBusinessDate: { $lte: currentBDate } },
              { feedbackStatus: 'COMPLETED' },
            ],
          },
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
