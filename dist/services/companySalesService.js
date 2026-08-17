"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.CompanySalesService = void 0;
const Lead_1 = require("../models/Lead");
const Sale_1 = require("../models/Sale");
const Upgrade_1 = require("../models/Upgrade");
const RemoteSupport_1 = require("../models/RemoteSupport");
const Employee_1 = require("../models/Employee");
const Counter_1 = require("../models/Counter");
const index_1 = require("../constants/index");
const businessDate_1 = require("../utils/businessDate");
const socket_1 = require("../realtime/socket");
const mongoose_1 = require("mongoose");
class CompanySalesService {
    static async assignVerificationEmployeeIfMissing(companyId, saleId, employeeId, employeeName) {
        const sale = await Sale_1.Sale.findOne({ companyId, _id: saleId, failed: { $ne: true } });
        if (!sale)
            return;
        if (!sale.verificationEmployeeId) {
            sale.verificationEmployeeId = new mongoose_1.Types.ObjectId(employeeId);
            sale.verificationEmployeeName = employeeName || sale.verificationEmployeeName || 'Verification Employee';
            await sale.save();
        }
    }
    static async assignVerificationEmployeeForSale(companyId, sale) {
        if (sale.failed === true || sale.verificationEmployeeId)
            return sale;
        const verificationEmployee = await Employee_1.Employee.findOne({
            companyId,
            role: index_1.Roles.VERIFICATION,
            isSuspended: false,
        }).sort({ createdAt: 1 }).select('_id name');
        if (!verificationEmployee)
            return sale;
        sale.verificationEmployeeId = verificationEmployee._id;
        sale.verificationEmployeeName = verificationEmployee.name;
        await sale.save();
        return sale;
    }
    static async getLeads(companyId, role, employeeId) {
        if (role === index_1.Roles.COMPANY_ADMIN) {
            return Lead_1.Lead.find({ companyId }).sort({ createdAt: -1 });
        }
        const employee = await Employee_1.Employee.findOne({ companyId, _id: employeeId }).select('name employeeId teamId');
        if (!employee)
            return [];
        if (role === index_1.Roles.SALES) {
            return Lead_1.Lead.find({
                companyId,
                $or: [
                    { assignedTo: new mongoose_1.Types.ObjectId(employeeId) },
                    { connectedBy: employee.name },
                    { connectedBy: employee.employeeId },
                ],
            }).sort({ createdAt: -1 });
        }
        if (role === index_1.Roles.MANAGER && employee.teamId) {
            const teamEmployees = await Employee_1.Employee.find({ companyId, teamId: employee.teamId }).select('_id name employeeId');
            const teamIds = teamEmployees.map((e) => e._id);
            const teamNames = teamEmployees.map((e) => e.name);
            return Lead_1.Lead.find({
                companyId,
                $or: [
                    { assignedTo: { $in: teamIds } },
                    { connectedBy: { $in: teamNames } },
                ],
            }).sort({ createdAt: -1 });
        }
        return Lead_1.Lead.find({ companyId }).sort({ createdAt: -1 });
    }
    static async createLead(companyId, data) {
        if (data.workflowMessageId) {
            const existingLead = await Lead_1.Lead.findOne({ companyId, workflowMessageId: data.workflowMessageId });
            if (existingLead)
                return existingLead;
        }
        const lead = await Lead_1.Lead.create({
            ...data,
            connected: data.connected || 'no',
            connectedBy: data.connectedBy || '',
            customerType: data.customerType || 'NEW',
            isSale: data.isSale || 'no',
            status: data.status || 'OPEN',
            completionReason: data.completionReason || '',
            companyId,
        });
        (0, socket_1.emitCompanyEvent)('lead:created', lead);
        return lead;
    }
    static async acceptLead(companyId, leadId, employeeId, employeeName) {
        const lead = await Lead_1.Lead.findOne({ companyId, _id: leadId });
        if (!lead)
            throw { statusCode: 404, message: 'Lead not found.' };
        lead.assignedTo = new mongoose_1.Types.ObjectId(employeeId);
        lead.assignedToName = employeeName;
        lead.connectedBy = employeeName;
        lead.acceptedAt = new Date();
        await lead.save();
        (0, socket_1.emitCompanyEvent)('lead:accepted', lead);
        return lead;
    }
    static async updateLead(companyId, id, data, role, employeeId) {
        const existing = await Lead_1.Lead.findOne({ companyId, _id: id });
        if (!existing)
            throw { statusCode: 404, message: 'Lead not found.' };
        // Backend Permission Enforcement for Sales
        if (role === index_1.Roles.SALES && employeeId) {
            const employee = await Employee_1.Employee.findOne({ companyId, _id: employeeId }).select('name employeeId');
            const isAssigned = (existing.assignedTo && existing.assignedTo.toString() === employeeId) ||
                (employee && (existing.connectedBy === employee.name || existing.connectedBy === employee.employeeId));
            if (!isAssigned) {
                throw { statusCode: 403, message: 'Not authorized to update this Lead. Leads can only be updated by their assigned Sales employee.' };
            }
        }
        // If finalStatus is being set to CLOSED — auto create sale record
        if (data.finalStatus === 'CLOSED') {
            const lead = await Lead_1.Lead.findOneAndUpdate({ companyId, _id: id }, { ...data, status: 'COMPLETED', isSale: 'yes', paymentConfirmed: 'yes' }, { new: true, runValidators: true });
            if (!lead)
                throw { statusCode: 404, message: 'Lead not found.' };
            // Auto-create Sale record if not already created
            const existingSale = await Sale_1.Sale.findOne({ companyId, leadId: id });
            if (!existingSale) {
                const currentBDate = (0, businessDate_1.getBusinessDateString)();
                const tomorrow = new Date();
                tomorrow.setDate(tomorrow.getDate() + 1);
                const nextBDate = (0, businessDate_1.getBusinessDateString)(tomorrow);
                let salesEmpId = lead.assignedTo ? new mongoose_1.Types.ObjectId(lead.assignedTo.toString()) : undefined;
                if (!salesEmpId && employeeId)
                    salesEmpId = new mongoose_1.Types.ObjectId(employeeId);
                const salesEmpName = lead.assignedToName || lead.connectedBy || 'Sales Employee';
                const salesEmployeeRemark = (data.salesEmployeeRemark ?? lead.salesEmployeeRemark ?? '').trim();
                const finalSaleAmount = Number(data.finalAmount ?? data.saleAmount ?? lead.saleAmount ?? 0);
                const mainAmount = Number(data.mainAmount ?? 0);
                const upgradedAmount = Number(data.upgradedAmount ?? 0);
                const salesTaxType = data.salesTaxType || 'PERCENTAGE';
                const salesTaxValue = Number(data.salesTaxValue ?? 0);
                const salesTaxAmount = Number(data.salesTaxAmount ?? (salesTaxType === 'PERCENTAGE' ? ((mainAmount + upgradedAmount) * salesTaxValue) / 100 : salesTaxValue));
                const computedFinalAmount = Number(data.finalAmount ?? ((mainAmount + upgradedAmount + salesTaxAmount) || finalSaleAmount));
                const customerId = await (0, Counter_1.getNextCustomerId)(companyId);
                const sale = await Sale_1.Sale.create({
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
                (0, socket_1.emitCompanyEvent)('sale:created', sale);
            }
            (0, socket_1.emitCompanyEvent)('lead:updated', lead);
            return lead;
        }
        // If finalStatus is PAYMENT_FAILED — close lead as no sale
        if (data.finalStatus === 'PAYMENT_FAILED') {
            const lead = await Lead_1.Lead.findOneAndUpdate({ companyId, _id: id }, { ...data, status: 'COMPLETED', isSale: 'no', paymentConfirmed: 'no' }, { new: true, runValidators: true });
            if (!lead)
                throw { statusCode: 404, message: 'Lead not found.' };
            (0, socket_1.emitCompanyEvent)('lead:updated', lead);
            return lead;
        }
        const lead = await Lead_1.Lead.findOneAndUpdate({ companyId, _id: id }, data, { new: true, runValidators: true });
        if (!lead)
            throw { statusCode: 404, message: 'Lead not found.' };
        (0, socket_1.emitCompanyEvent)('lead:updated', lead);
        return lead;
    }
    static async deleteLead(companyId, id) {
        const result = await Lead_1.Lead.deleteOne({ companyId, _id: id });
        if (!result.deletedCount)
            throw { statusCode: 404, message: 'Lead not found.' };
        (0, socket_1.emitCompanyEvent)('lead:deleted', { id });
        return { id };
    }
    static calculateSalesTotals(records = []) {
        let revenue = 0;
        let transactionCount = 0;
        for (const record of records) {
            if (record.saleStatus === 'DROPPED' || record.saleStatus === 'PENDING' || record.failed === true)
                continue;
            const amount = Number(record.finalAmount ?? record.amount ?? 0);
            if (!Number.isFinite(amount) || amount <= 0)
                continue;
            revenue += amount;
            transactionCount += 1;
        }
        return { revenue, transactionCount };
    }
    static async getSales(companyId, role, employeeId, failed = false, pending = false) {
        const currentBDate = (0, businessDate_1.getBusinessDateString)();
        const statusQuery = pending
            ? { saleStatus: 'PENDING', businessDate: currentBDate }
            : failed
                ? { failed: true }
                : {
                    $and: [
                        { $or: [{ failed: false }, { failed: { $exists: false } }] },
                        { $or: [{ saleStatus: 'CHARGED' }, { saleStatus: { $exists: false } }, { saleStatus: null }] },
                    ],
                };
        if (role === index_1.Roles.COMPANY_ADMIN) {
            return Sale_1.Sale.find({ companyId, ...statusQuery }).sort({ createdAt: -1 });
        }
        const employee = await Employee_1.Employee.findOne({ companyId, _id: employeeId }).select('name employeeId teamId');
        if (!employee)
            return [];
        if (role === index_1.Roles.SALES) {
            return Sale_1.Sale.find({
                companyId,
                ...statusQuery,
                $or: [
                    { salesEmployeeId: new mongoose_1.Types.ObjectId(employeeId) },
                    { connectedBy: employee.name },
                    { connectedBy: employee.employeeId },
                ],
            }).sort({ createdAt: -1 });
        }
        if (role === index_1.Roles.MANAGER && employee.teamId) {
            const teamEmployees = await Employee_1.Employee.find({ companyId, teamId: employee.teamId }).select('_id name employeeId');
            const teamIds = teamEmployees.map((e) => e._id);
            const teamNames = teamEmployees.map((e) => e.name);
            return Sale_1.Sale.find({
                companyId,
                ...statusQuery,
                $or: [
                    { salesEmployeeId: { $in: teamIds } },
                    { connectedBy: { $in: teamNames } },
                ],
            }).sort({ createdAt: -1 });
        }
        return Sale_1.Sale.find({ companyId, ...statusQuery }).sort({ createdAt: -1 });
    }
    static async createSale(companyId, data, currentUserId, currentUserName) {
        if (data.leadId) {
            const existingSale = await Sale_1.Sale.findOne({ companyId, leadId: data.leadId });
            if (existingSale)
                return existingSale;
        }
        const salesEmployeeRemark = (data.salesEmployeeRemark || '').trim();
        const currentBDate = (0, businessDate_1.getBusinessDateString)();
        const tomorrow = new Date();
        tomorrow.setDate(tomorrow.getDate() + 1);
        const nextBDate = (0, businessDate_1.getBusinessDateString)(tomorrow);
        let salesEmpId = data.salesEmployeeId ? new mongoose_1.Types.ObjectId(data.salesEmployeeId) : undefined;
        let salesEmpName = data.salesEmployeeName || data.connectedBy;
        if (!salesEmpId && currentUserId) {
            salesEmpId = new mongoose_1.Types.ObjectId(currentUserId);
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
        const customerId = data.customerId || (await (0, Counter_1.getNextCustomerId)(companyId));
        const sale = await Sale_1.Sale.create({
            ...data,
            companyId,
            customerId,
            customerType: data.customerType || 'NEW',
            transactionType: 'SALE',
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
            saleStatus: data.saleStatus || 'PENDING',
            salesEmployeeRemark,
            verificationStatus: 'PENDING',
            feedbackStatus: 'PENDING',
            feedbackBusinessDate: nextBDate,
        });
        if (data.leadId) {
            await Lead_1.Lead.findOneAndUpdate({ companyId, _id: data.leadId }, { isSale: 'yes', status: 'COMPLETED' });
        }
        await CompanySalesService.assignVerificationEmployeeForSale(companyId, sale);
        (0, socket_1.emitCompanyEvent)('sale:created', sale);
        return sale;
    }
    static async updateSale(companyId, id, data) {
        const existing = await Sale_1.Sale.findOne({ companyId, _id: id });
        if (!existing)
            throw { statusCode: 404, message: 'Sale not found.' };
        const mainAmount = Number(data.mainAmount ?? existing.mainAmount ?? 0);
        const upgradedAmount = Number(data.upgradedAmount ?? existing.upgradedAmount ?? 0);
        const salesTaxType = data.salesTaxType || existing.salesTaxType || 'PERCENTAGE';
        const salesTaxValue = Number(data.salesTaxValue ?? existing.salesTaxValue ?? 0);
        const salesTaxAmount = Number(data.salesTaxAmount ?? (salesTaxType === 'PERCENTAGE' ? ((mainAmount + upgradedAmount) * salesTaxValue) / 100 : salesTaxValue));
        const derivedFinalAmount = Number(mainAmount + upgradedAmount + salesTaxAmount || existing.finalAmount || existing.amount || 0);
        const finalAmount = Number(data.finalAmount ?? derivedFinalAmount);
        const updated = await Sale_1.Sale.findOneAndUpdate({ companyId, _id: id }, {
            ...data,
            saleStatus: data.saleStatus || existing.saleStatus || 'PENDING',
            failed: data.saleStatus === 'DROPPED' ? true : existing.failed && data.saleStatus !== 'CHARGED',
            failedReason: data.saleStatus === 'DROPPED' ? (data.failedReason || existing.failedReason || '').trim() : '',
            salesEmployeeRemark: data.salesEmployeeRemark !== undefined ? data.salesEmployeeRemark.trim() : existing.salesEmployeeRemark || '',
            mainAmount,
            upgradedAmount,
            salesTaxType,
            salesTaxValue,
            salesTaxAmount,
            finalAmount,
            amount: Number(data.amount ?? finalAmount),
        }, { new: true, runValidators: true });
        if (!updated)
            throw { statusCode: 404, message: 'Sale not found.' };
        (0, socket_1.emitCompanyEvent)('sale:updated', updated);
        return updated;
    }
    static async markSaleFailed(companyId, id, failedReason, failedById, failedByName, saleStatus = 'DROPPED') {
        const trimmedReason = failedReason?.trim() || '';
        if (saleStatus === 'DROPPED' && !trimmedReason)
            throw { statusCode: 400, message: 'Dropped reason is required.' };
        const tomorrow = new Date();
        tomorrow.setDate(tomorrow.getDate() + 1);
        const nextBDate = (0, businessDate_1.getBusinessDateString)(tomorrow);
        const updateData = {
            saleStatus,
            failed: saleStatus === 'DROPPED',
            failedReason: saleStatus === 'DROPPED' ? trimmedReason : '',
            failedAt: saleStatus === 'DROPPED' ? new Date() : null,
            failedBy: saleStatus === 'DROPPED' ? failedById : null,
            failedByName: saleStatus === 'DROPPED' ? failedByName : '',
        };
        // When marking as CHARGED, initialize verification and feedback workflow
        if (saleStatus === 'CHARGED') {
            updateData.verificationStatus = 'PENDING';
            updateData.feedbackStatus = 'PENDING';
            updateData.feedbackBusinessDate = nextBDate;
        }
        const sale = await Sale_1.Sale.findOneAndUpdate({ companyId, _id: id }, updateData, { new: true, runValidators: true });
        if (!sale)
            throw { statusCode: 404, message: 'Sale not found.' };
        // Assign verification employee if marking as CHARGED
        if (saleStatus === 'CHARGED' && sale) {
            await CompanySalesService.assignVerificationEmployeeForSale(companyId, sale);
        }
        (0, socket_1.emitCompanyEvent)('sale:updated', sale);
        return sale;
    }
    static async deleteSale(companyId, id) {
        const result = await Sale_1.Sale.deleteOne({ companyId, _id: id });
        if (!result.deletedCount)
            throw { statusCode: 404, message: 'Sale not found.' };
        (0, socket_1.emitCompanyEvent)('sale:deleted', { id });
        return { id };
    }
    static buildCustomerSearchFilters(search) {
        const trimmed = (search || '').trim();
        if (!trimmed)
            return [];
        const escaped = trimmed.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
        const regex = new RegExp(escaped, 'i');
        const conditions = [
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
        if (mongoose_1.Types.ObjectId.isValid(trimmed)) {
            const objId = new mongoose_1.Types.ObjectId(trimmed);
            conditions.push({ _id: objId });
            conditions.push({ leadId: objId });
        }
        return conditions;
    }
    static async searchCustomers(companyId, role, employeeId, q) {
        const search = (q || '').trim();
        if (!search) {
            if (role === index_1.Roles.SALES && employeeId && mongoose_1.Types.ObjectId.isValid(employeeId)) {
                return Sale_1.Sale.find({ companyId, salesEmployeeId: new mongoose_1.Types.ObjectId(employeeId) }).sort({ createdAt: -1 }).limit(50);
            }
            return Sale_1.Sale.find({ companyId }).sort({ createdAt: -1 }).limit(50);
        }
        const searchFilters = CompanySalesService.buildCustomerSearchFilters(search);
        if (!searchFilters.length)
            return [];
        return Sale_1.Sale.find({ companyId, $or: searchFilters }).sort({ createdAt: -1 }).limit(100);
    }
    static async createUpgrade(companyId, data, currentUserId, currentUserName) {
        const customerId = data.customerId || (await (0, Counter_1.getNextCustomerId)(companyId));
        const upgradeAmount = Number(data.upgradeAmount ?? data.amount ?? 0);
        const salesTaxType = data.salesTaxType || 'PERCENTAGE';
        const salesTaxValue = Number(data.salesTaxValue ?? 0);
        const salesTaxAmount = Number(data.salesTaxAmount ?? (salesTaxType === 'PERCENTAGE' ? (upgradeAmount * salesTaxValue) / 100 : salesTaxValue));
        const finalAmount = Number(data.finalAmount ?? (upgradeAmount + salesTaxAmount));
        const saleForUpgrade = await Sale_1.Sale.findOne({ companyId, customerId }).sort({ createdAt: -1 });
        const existingUpgrades = await Upgrade_1.Upgrade.countDocuments({ companyId, customerId });
        const validCurrentUserId = currentUserId && mongoose_1.Types.ObjectId.isValid(currentUserId) ? new mongoose_1.Types.ObjectId(currentUserId) : undefined;
        const currentBDate = (0, businessDate_1.getBusinessDateString)();
        const tomorrow = new Date();
        tomorrow.setDate(tomorrow.getDate() + 1);
        const nextBDate = (0, businessDate_1.getBusinessDateString)(tomorrow);
        const hasTechSupport = data.needsTechSupport === 'yes' || data.needsTechSupport === true;
        const upgrade = await Upgrade_1.Upgrade.create({
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
            const rsTicket = await RemoteSupport_1.RemoteSupport.create({
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
            (0, socket_1.emitCompanyEvent)('remote-support:created', rsTicket);
        }
        const upgradeSale = await Sale_1.Sale.create({
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
            transactionType: 'UPGRADE',
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
            verificationStatus: hasTechSupport ? 'PENDING' : 'PENDING',
            feedbackStatus: 'PENDING',
            feedbackBusinessDate: nextBDate,
        });
        await Upgrade_1.Upgrade.updateOne({ _id: upgrade._id }, { $set: { saleId: upgradeSale._id } });
        if (!hasTechSupport) {
            await CompanySalesService.assignVerificationEmployeeForSale(companyId, upgradeSale);
        }
        (0, socket_1.emitCompanyEvent)('sale:created', upgradeSale);
        (0, socket_1.emitCompanyEvent)('verification:updated', upgradeSale);
        (0, socket_1.emitCompanyEvent)('upgrade:created', { ...upgrade.toObject(), saleId: upgradeSale._id });
        return upgrade;
    }
    static async getUpgrades(companyId, role, employeeId, filters = {}) {
        const query = { companyId };
        if (filters.customerId)
            query.customerId = filters.customerId;
        if (filters.status)
            query.status = filters.status;
        const andConditions = [];
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
        if (role === index_1.Roles.SALES && employeeId && mongoose_1.Types.ObjectId.isValid(employeeId)) {
            const empObjectId = new mongoose_1.Types.ObjectId(employeeId);
            andConditions.push({
                $or: [
                    { salesEmployeeId: empObjectId },
                    { upgradedBy: empObjectId },
                ],
            });
        }
        if (andConditions.length === 1) {
            Object.assign(query, andConditions[0]);
        }
        else if (andConditions.length > 1) {
            query.$and = andConditions;
        }
        return Upgrade_1.Upgrade.find(query).sort({ createdAt: -1 });
    }
    static async createVerification(companyId, data, currentUserId) {
        const currentBDate = (0, businessDate_1.getBusinessDateString)();
        const amount = Number(data.amount ?? data.finalAmount ?? 0);
        const mainAmount = Number(data.mainAmount ?? amount);
        const upgradedAmount = Number(data.upgradedAmount ?? 0);
        const salesTaxType = data.salesTaxType || 'PERCENTAGE';
        const salesTaxValue = Number(data.salesTaxValue ?? 0);
        const salesTaxAmount = Number(data.salesTaxAmount ?? (salesTaxType === 'PERCENTAGE' ? ((mainAmount + upgradedAmount) * salesTaxValue) / 100 : salesTaxValue));
        const derivedFinalAmount = Number(mainAmount + upgradedAmount + salesTaxAmount || amount || 0);
        const finalAmount = Number(data.finalAmount ?? derivedFinalAmount);
        const sale = await Sale_1.Sale.create({
            ...data,
            companyId,
            name: data.name || 'Customer',
            country: data.country || 'Unknown',
            system: data.system || 'N/A',
            connectedBy: data.connectedBy || 'Admin',
            customerType: data.customerType || 'NEW',
            salesEmployeeId: data.salesEmployeeId ? new mongoose_1.Types.ObjectId(data.salesEmployeeId) : currentUserId ? new mongoose_1.Types.ObjectId(currentUserId) : undefined,
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
        (0, socket_1.emitCompanyEvent)('verification:updated', sale);
        return sale;
    }
    static async updateVerification(companyId, id, data) {
        const existing = await Sale_1.Sale.findOne({ companyId, _id: id });
        if (!existing)
            throw { statusCode: 404, message: 'Verification record not found.' };
        const mainAmount = Number(data.mainAmount ?? existing.mainAmount ?? existing.amount ?? 0);
        const upgradedAmount = Number(data.upgradedAmount ?? existing.upgradedAmount ?? 0);
        const salesTaxType = data.salesTaxType || existing.salesTaxType || 'PERCENTAGE';
        const salesTaxValue = Number(data.salesTaxValue ?? existing.salesTaxValue ?? 0);
        const salesTaxAmount = Number(data.salesTaxAmount ?? (salesTaxType === 'PERCENTAGE' ? ((mainAmount + upgradedAmount) * salesTaxValue) / 100 : salesTaxValue));
        const derivedFinalAmount = Number(mainAmount + upgradedAmount + salesTaxAmount || existing.finalAmount || existing.amount || 0);
        const finalAmount = Number(data.finalAmount ?? derivedFinalAmount);
        const updated = await Sale_1.Sale.findOneAndUpdate({ companyId, _id: id }, {
            ...data,
            customerType: data.customerType || existing.customerType || 'NEW',
            amount: Number(data.amount ?? finalAmount),
            mainAmount,
            upgradedAmount,
            salesTaxType,
            salesTaxValue,
            salesTaxAmount,
            finalAmount,
        }, { new: true, runValidators: true });
        if (!updated)
            throw { statusCode: 404, message: 'Verification record not found.' };
        (0, socket_1.emitCompanyEvent)('verification:updated', updated);
        return updated;
    }
    static async deleteVerification(companyId, id) {
        const result = await Sale_1.Sale.deleteOne({ companyId, _id: id });
        if (!result.deletedCount)
            throw { statusCode: 404, message: 'Verification record not found.' };
        (0, socket_1.emitCompanyEvent)('verification:updated', { _id: id, companyId });
        return { id };
    }
    // Verification Methods
    static async getVerifications(companyId, role, employeeId, filters = {}) {
        if (role === index_1.Roles.VERIFICATION) {
            const unassigned = await Sale_1.Sale.find({
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
        const query = {
            companyId,
            failed: { $ne: true },
            $or: [{ saleStatus: { $ne: 'DROPPED' } }, { saleStatus: { $exists: false } }, { saleStatus: null }],
        };
        if (filters.status)
            query.verificationStatus = filters.status;
        if (role === index_1.Roles.VERIFICATION) {
            query.$or = [
                { verificationEmployeeId: new mongoose_1.Types.ObjectId(employeeId) },
                { verificationEmployeeId: null },
                { verificationEmployeeId: { $exists: false } },
            ];
        }
        return Sale_1.Sale.find(query).sort({ createdAt: -1 });
    }
    static async startVerification(companyId, id, employeeId, employeeName) {
        const sale = await Sale_1.Sale.findOne({ companyId, _id: id });
        if (!sale)
            throw { statusCode: 404, message: 'Sale record not found.' };
        sale.verificationStatus = 'IN_PROGRESS';
        sale.verificationEmployeeId = sale.verificationEmployeeId || new mongoose_1.Types.ObjectId(employeeId);
        sale.verificationEmployeeName = sale.verificationEmployeeName || employeeName;
        await sale.save();
        if (!sale)
            throw { statusCode: 404, message: 'Sale record not found.' };
        (0, socket_1.emitCompanyEvent)('verification:updated', sale);
        return sale;
    }
    static async completeVerification(companyId, id, verifiedById, verifiedByName, data) {
        const sale = await Sale_1.Sale.findOne({ companyId, _id: id });
        if (!sale)
            throw { statusCode: 404, message: 'Sale record not found.' };
        if (data.status === 'SUCCESSFUL') {
            sale.verificationStatus = 'SUCCESSFUL';
            sale.verifiedBy = new mongoose_1.Types.ObjectId(verifiedById);
            sale.verifiedByName = verifiedByName;
            sale.verifiedAt = new Date();
            sale.verificationNotes = data.notes || '';
            sale.verificationPendingReason = '';
            sale.feedbackStatus = 'PENDING';
            sale.feedbackRating = undefined;
            sale.feedbackNotes = '';
            sale.feedbackBy = null;
            sale.feedbackByName = '';
            sale.feedbackAt = null;
            const nextBusinessDate = new Date();
            nextBusinessDate.setDate(nextBusinessDate.getDate() + 1);
            sale.feedbackBusinessDate = (0, businessDate_1.getBusinessDateString)(nextBusinessDate);
        }
        else if (data.status === 'PENDING') {
            if (!data.pendingReason || !data.pendingReason.trim()) {
                throw { statusCode: 400, message: 'Pending reason is required when marking verification as pending.' };
            }
            sale.verificationStatus = 'PENDING';
            sale.verificationPendingReason = data.pendingReason.trim();
        }
        else {
            if (!data.failedReason || !data.failedReason.trim()) {
                throw { statusCode: 400, message: 'Failure reason is required when marking verification as failed.' };
            }
            sale.verificationStatus = 'FAILED';
            sale.verificationFailedBy = new mongoose_1.Types.ObjectId(verifiedById);
            sale.verificationFailedByName = verifiedByName;
            sale.verificationFailedReason = data.failedReason.trim();
            sale.verificationFailedAt = new Date();
            sale.verificationPendingReason = '';
            sale.feedbackStatus = 'PENDING';
            sale.feedbackBusinessDate = '';
        }
        await sale.save();
        (0, socket_1.emitCompanyEvent)('verification:updated', sale);
        return sale;
    }
    // Feedback Methods
    static async getFeedbacks(companyId, role, employeeId, filters = {}) {
        const currentBDate = (0, businessDate_1.getBusinessDateString)();
        const query = {
            companyId,
            failed: { $ne: true },
            $or: [{ saleStatus: { $ne: 'DROPPED' } }, { saleStatus: { $exists: false } }, { saleStatus: null }],
            verificationStatus: 'SUCCESSFUL',
        };
        if (filters.status === 'PENDING') {
            query.feedbackStatus = 'PENDING';
            query.feedbackBusinessDate = { $ne: '', $lte: currentBDate };
        }
        else if (filters.status === 'COMPLETED') {
            query.feedbackStatus = 'COMPLETED';
        }
        else {
            query.$or = [
                { feedbackStatus: 'PENDING', feedbackBusinessDate: { $ne: '', $lte: currentBDate } },
                { feedbackStatus: 'COMPLETED' },
            ];
        }
        if (role === index_1.Roles.VERIFICATION || role === index_1.Roles.FEEDBACK) {
            query.$and = [
                {
                    $or: [
                        { verificationEmployeeId: new mongoose_1.Types.ObjectId(employeeId) },
                        { verificationEmployeeId: null },
                        { verificationEmployeeId: { $exists: false } },
                    ],
                },
            ];
        }
        return Sale_1.Sale.find(query).sort({ createdAt: -1 });
    }
    static async completeFeedback(companyId, id, feedbackById, feedbackByName, data) {
        if (data.status === 'PENDING') {
            if (!data.pendingReason || !data.pendingReason.trim()) {
                throw { statusCode: 400, message: 'Pending reason is required when marking feedback as pending.' };
            }
            const sale = await Sale_1.Sale.findOne({ companyId, _id: id });
            if (!sale)
                throw { statusCode: 404, message: 'Sale record not found.' };
            sale.feedbackStatus = 'PENDING';
            sale.feedbackPendingReason = data.pendingReason.trim();
            const nextBusinessDate = new Date();
            nextBusinessDate.setDate(nextBusinessDate.getDate() + 1);
            sale.feedbackBusinessDate = (0, businessDate_1.getBusinessDateString)(nextBusinessDate);
            await sale.save();
            (0, socket_1.emitCompanyEvent)('feedback:updated', sale);
            return sale;
        }
        if (!data.rating)
            throw { statusCode: 400, message: 'Feedback rating is required.' };
        const sale = await Sale_1.Sale.findOne({ companyId, _id: id });
        if (!sale)
            throw { statusCode: 404, message: 'Sale record not found.' };
        sale.feedbackStatus = 'COMPLETED';
        sale.feedbackRating = data.rating;
        sale.feedbackNotes = data.notes || '';
        sale.feedbackBy = new mongoose_1.Types.ObjectId(feedbackById);
        sale.feedbackByName = feedbackByName;
        sale.feedbackAt = new Date();
        sale.feedbackPendingReason = '';
        await sale.save();
        (0, socket_1.emitCompanyEvent)('feedback:updated', sale);
        return sale;
    }
    // Today's Work Methods
    static async getTodaysWork(companyId, role, employeeId, employeeName) {
        const currentBDate = (0, businessDate_1.getBusinessDateString)();
        if (role === index_1.Roles.SALES) {
            const leads = await Lead_1.Lead.find({
                companyId,
                $or: [{ assignedTo: new mongoose_1.Types.ObjectId(employeeId) }, { connectedBy: employeeName }],
            }).sort({ createdAt: -1 });
            const sales = await Sale_1.Sale.find({
                companyId,
                $or: [{ salesEmployeeId: new mongoose_1.Types.ObjectId(employeeId) }, { connectedBy: employeeName }],
                businessDate: currentBDate,
            }).sort({ createdAt: -1 });
            return { role, leads, sales, businessDate: currentBDate };
        }
        if (role === index_1.Roles.TECH_SUPPORT) {
            const RemoteSupport = (await import('../models/RemoteSupport.js')).RemoteSupport;
            const tickets = await RemoteSupport.find({
                companyId,
                $or: [
                    { techSupportEmployeeId: new mongoose_1.Types.ObjectId(employeeId) },
                    { techSupportEmployeeName: employeeName },
                    { status: 'PENDING' },
                ],
            }).sort({ createdAt: -1 });
            return { role, tickets, businessDate: currentBDate };
        }
        if (role === index_1.Roles.VERIFICATION) {
            // Assign any unassigned pending verifications to this employee
            const unassigned = await Sale_1.Sale.find({
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
            // Show ALL pending/in-progress verifications to all verification employees (not just assigned ones)
            const verifications = await Sale_1.Sale.find({
                companyId,
                failed: { $ne: true },
                verificationStatus: { $in: ['PENDING', 'IN_PROGRESS'] },
            }).sort({ createdAt: -1 });
            // Show successful verifications pending feedback
            const feedbacks = await Sale_1.Sale.find({
                companyId,
                failed: { $ne: true },
                verificationStatus: 'SUCCESSFUL',
                $or: [
                    { feedbackBusinessDate: { $lte: currentBDate } },
                    { feedbackStatus: { $ne: 'COMPLETED' } },
                ],
            }).sort({ createdAt: -1 });
            return { role, verifications, feedbacks, businessDate: currentBDate };
        }
        if (role === index_1.Roles.MANAGER || role === index_1.Roles.COMPANY_ADMIN) {
            const leads = await Lead_1.Lead.find({ companyId }).sort({ createdAt: -1 });
            const sales = await Sale_1.Sale.find({ companyId, businessDate: currentBDate }).sort({ createdAt: -1 });
            const RemoteSupport = (await import('../models/RemoteSupport.js')).RemoteSupport;
            const tickets = await RemoteSupport.find({ companyId }).sort({ createdAt: -1 });
            return { role, leads, sales, tickets, businessDate: currentBDate };
        }
        return { role, businessDate: currentBDate };
    }
}
exports.CompanySalesService = CompanySalesService;
function feedbackByIdOrVerifiedById(id) {
    try {
        return new mongoose_1.Types.ObjectId(id);
    }
    catch (e) {
        return undefined;
    }
}
