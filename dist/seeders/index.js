"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const dotenv_1 = __importDefault(require("dotenv"));
dotenv_1.default.config();
const bcryptjs_1 = __importDefault(require("bcryptjs"));
const mongoose_1 = __importDefault(require("mongoose"));
const db_1 = require("../config/db");
const Company_1 = require("../models/Company");
const Employee_1 = require("../models/Employee");
const constants_1 = require("../constants");
const generateEmployeeId = () => {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
    let id = '';
    for (let i = 0; i < 8; i++)
        id += chars.charAt(Math.floor(Math.random() * chars.length));
    return id;
};
const seedDefaultCompany = async () => {
    try {
        await (0, db_1.connectDB)();
        const existing = await Company_1.Company.findOne({ name: 'Default Company' });
        if (existing) {
            console.log('[Seeder] Default company already exists');
            await mongoose_1.default.connection.close();
            process.exit(0);
        }
        const company = await Company_1.Company.create({
            companyIdString: 'COMP-001',
            companyCode: 'DEFAULT',
            name: 'Default Company',
            email: 'admin@gmail.com',
            phone: '+0000000000',
            planExpiryDate: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000),
        });
        const hashedPassword = await bcryptjs_1.default.hash('admin123', 10);
        let empId = generateEmployeeId();
        while (await Employee_1.Employee.exists({ companyId: company._id, employeeId: empId })) {
            empId = generateEmployeeId();
        }
        await Employee_1.Employee.create({
            companyId: company._id,
            employeeId: empId,
            name: 'Company Admin',
            email: 'admin@gmail.com',
            passwordHash: hashedPassword,
            phone: '+0000000000',
            role: constants_1.Roles.COMPANY_ADMIN,
            permissions: [],
            isSuspended: false,
            refreshTokens: [],
        });
        console.log('[Seeder] Default company and admin created');
        console.log('Admin email: admin@gmail.com');
        console.log('Admin password: admin123');
        await mongoose_1.default.connection.close();
        process.exit(0);
    }
    catch (error) {
        console.error('[Seeder Error]:', error);
        process.exit(1);
    }
};
seedDefaultCompany();
