"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.enforceEmployeeLoginEnabled = void 0;
const Company_1 = require("../models/Company");
const enforceEmployeeLoginEnabled = async (req, res, next) => {
    try {
        const user = req.user;
        if (!user || !user.companyId)
            return next();
        // Admins must not be blocked
        if (user.portalType === 'COMPANY_ADMIN')
            return next();
        const company = await Company_1.Company.findById(user.companyId).select('settings');
        if (company && company.settings && company.settings.employeeLoginEnabled === false) {
            return res.status(403).json({ success: false, message: 'Employee access is currently disabled by Admin.' });
        }
        next();
    }
    catch (err) {
        next(err);
    }
};
exports.enforceEmployeeLoginEnabled = enforceEmployeeLoginEnabled;
