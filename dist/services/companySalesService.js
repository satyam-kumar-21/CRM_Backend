"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.CompanySalesService = void 0;
const Lead_1 = require("../models/Lead");
const Sale_1 = require("../models/Sale");
const Employee_1 = require("../models/Employee");
const businessDate_1 = require("../utils/businessDate");
class CompanySalesService {
    static async syncConvertedSale(companyId, lead) {
        if (lead.isSale !== 'yes')
            return;
        const saleData = {
            name: lead.name,
            country: lead.country,
            system: lead.system,
            connectedBy: lead.connectedBy,
        };
        const existingSale = await Sale_1.Sale.findOne({ companyId, leadId: lead._id });
        if (existingSale) {
            await Sale_1.Sale.updateOne({ _id: existingSale._id }, saleData);
            return;
        }
        await Sale_1.Sale.create({
            ...saleData,
            companyId,
            leadId: lead._id,
            amount: 0,
            paymentMethod: 'Other',
            saleDate: (0, businessDate_1.getBusinessDateString)(),
        });
    }
    static async getLeads(companyId, employeeId) {
        if (!employeeId)
            return Lead_1.Lead.find({ companyId }).sort({ createdAt: -1 });
        const employee = await Employee_1.Employee.findOne({ companyId, _id: employeeId }).select('name employeeId');
        if (!employee)
            return [];
        return Lead_1.Lead.find({ companyId, $or: [{ connectedBy: employee.name }, { connectedBy: employee.employeeId }] }).sort({ createdAt: -1 });
    }
    static async createLead(companyId, data) {
        if (data.workflowMessageId) {
            const existingLead = await Lead_1.Lead.findOne({ companyId, workflowMessageId: data.workflowMessageId });
            if (existingLead)
                return existingLead;
        }
        const lead = await Lead_1.Lead.create({ ...data, companyId });
        await this.syncConvertedSale(companyId, lead);
        return lead;
    }
    static async updateLead(companyId, id, data) {
        const lead = await Lead_1.Lead.findOneAndUpdate({ companyId, _id: id }, data, { new: true, runValidators: true });
        if (!lead)
            throw { statusCode: 404, message: 'Lead not found.' };
        await this.syncConvertedSale(companyId, lead);
        return lead;
    }
    static async deleteLead(companyId, id) {
        const result = await Lead_1.Lead.deleteOne({ companyId, _id: id });
        if (!result.deletedCount)
            throw { statusCode: 404, message: 'Lead not found.' };
        return { id };
    }
    static async getSales(companyId, employeeId, failed = false) {
        const statusQuery = failed
            ? { failed: true }
            : { $or: [{ failed: false }, { failed: { $exists: false } }] };
        if (!employeeId)
            return Sale_1.Sale.find({ companyId, ...statusQuery }).sort({ saleDate: -1, createdAt: -1 });
        const employee = await Employee_1.Employee.findOne({ companyId, _id: employeeId }).select('name employeeId');
        if (!employee)
            return [];
        return Sale_1.Sale.find({
            companyId,
            ...statusQuery,
            $or: [{ connectedBy: employee.name }, { connectedBy: employee.employeeId }],
        }).sort({ saleDate: -1, createdAt: -1 });
    }
    static async createSale(companyId, data) {
        if (data.leadId) {
            const existingSale = await Sale_1.Sale.findOne({ companyId, leadId: data.leadId });
            if (existingSale)
                return existingSale;
        }
        return Sale_1.Sale.create({ ...data, companyId });
    }
    static async updateSale(companyId, id, data) {
        const sale = await Sale_1.Sale.findOneAndUpdate({ companyId, _id: id }, data, { new: true, runValidators: true });
        if (!sale)
            throw { statusCode: 404, message: 'Sale not found.' };
        return sale;
    }
    static async markSaleFailed(companyId, id, failedReason, failedById, failedByName) {
        if (!failedReason || !failedReason.trim())
            throw { statusCode: 400, message: 'Failed reason is required.' };
        const sale = await Sale_1.Sale.findOneAndUpdate({ companyId, _id: id }, {
            failed: true,
            failedReason: failedReason.trim(),
            failedAt: new Date(),
            failedBy: failedById,
            failedByName,
        }, { new: true, runValidators: true });
        if (!sale)
            throw { statusCode: 404, message: 'Sale not found.' };
        return sale;
    }
    static async deleteSale(companyId, id) {
        const result = await Sale_1.Sale.deleteOne({ companyId, _id: id });
        if (!result.deletedCount)
            throw { statusCode: 404, message: 'Sale not found.' };
        return { id };
    }
}
exports.CompanySalesService = CompanySalesService;
