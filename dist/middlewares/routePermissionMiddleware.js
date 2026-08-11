"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.routePermission = void 0;
const Company_1 = require("../models/Company");
const routePermission = (key) => {
    return async (req, res, next) => {
        try {
            const user = req.user;
            if (!user || !user.companyId)
                return next();
            if (user.portalType === 'COMPANY_ADMIN')
                return next();
            const company = await Company_1.Company.findById(user.companyId).select('settings');
            if (!company)
                return res.status(403).json({ success: false, message: 'Access denied.' });
            const perms = (company.settings && company.settings.routePermissions) || {};
            if (perms instanceof Map) {
                // Mongoose Map
                const val = perms.get(key);
                if (val === false)
                    return res.status(403).json({ success: false, message: 'Access restricted by Admin.' });
            }
            else {
                if (perms[key] === false)
                    return res.status(403).json({ success: false, message: 'Access restricted by Admin.' });
            }
            next();
        }
        catch (err) {
            next(err);
        }
    };
};
exports.routePermission = routePermission;
