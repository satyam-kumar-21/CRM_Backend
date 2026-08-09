"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.CompanySalesService = void 0;
const Lead_1 = require("../models/Lead");
const Sale_1 = require("../models/Sale");
class CompanySalesService {
    static getLeads(companyId) {
        return Lead_1.Lead.find({ companyId }).sort({ createdAt: -1 });
    }
    static createLead(companyId, data) {
        return Lead_1.Lead.create({ ...data, companyId });
    }
    static async updateLead(companyId, id, data) {
        const lead = await Lead_1.Lead.findOneAndUpdate({ companyId, _id: id }, data, { new: true, runValidators: true });
        if (!lead)
            throw { statusCode: 404, message: 'Lead not found.' };
        return lead;
    }
    static async deleteLead(companyId, id) {
        const result = await Lead_1.Lead.deleteOne({ companyId, _id: id });
        if (!result.deletedCount)
            throw { statusCode: 404, message: 'Lead not found.' };
        return { id };
    }
    static getSales(companyId) {
        return Sale_1.Sale.find({ companyId }).sort({ saleDate: -1, createdAt: -1 });
    }
    static createSale(companyId, data) {
        return Sale_1.Sale.create({ ...data, companyId });
    }
    static async updateSale(companyId, id, data) {
        const sale = await Sale_1.Sale.findOneAndUpdate({ companyId, _id: id }, data, { new: true, runValidators: true });
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
