"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.enforceTenant = void 0;
const Company_1 = require("../models/Company");
const index_1 = require("../constants/index");
const enforceTenant = async (req, res, next) => {
    try {
        const companyId = req.user?.companyId;
        if (!companyId) {
            res.status(401).json({ success: false, message: 'Tenant identifier missing from request context.' });
            return;
        }
        const company = await Company_1.Company.findById(companyId).select('status name');
        if (!company) {
            res.status(404).json({ success: false, message: 'Company tenant record not found.' });
            return;
        }
        if (company.status === index_1.CompanyStatus.SUSPENDED || company.status === index_1.CompanyStatus.BLOCKED) {
            res.status(403).json({ success: false, message: 'This company has been suspended.' });
            return;
        }
        next();
    }
    catch (error) {
        next(error);
    }
};
exports.enforceTenant = enforceTenant;
