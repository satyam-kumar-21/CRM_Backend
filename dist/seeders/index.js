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
        const existing = await Company_1.Company.findOne({ email: 'techno@admin.com' });
        if (existing) {
            console.log('[Seeder] Techno Sky Solutions company already exists');
            await mongoose_1.default.connection.close();
            process.exit(0);
        }
        const company = await Company_1.Company.create({
            companyIdString: 'COMP-001',
            companyCode: 'TECHNO',
            name: 'Techno Sky Solutions',
            email: 'techno@admin.com',
            phone: '+0000000000',
            planExpiryDate: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000),
        });
        const hashedPassword = await bcryptjs_1.default.hash('12345678', 10);
        let empId = generateEmployeeId();
        while (await Employee_1.Employee.exists({ companyId: company._id, employeeId: empId })) {
            empId = generateEmployeeId();
        }
        await Employee_1.Employee.create({
            companyId: company._id,
            employeeId: empId,
            name: 'Company Admin',
            email: 'techno@admin.com',
            passwordHash: hashedPassword,
            phone: '+0000000000',
            role: constants_1.Roles.COMPANY_ADMIN,
            permissions: [],
            isSuspended: false,
            refreshTokens: [],
        });
        console.log('[Seeder] Techno Sky Solutions and admin created successfully');
        console.log('Admin email: techno@admin.com');
        console.log('Admin password: 12345678');
        await mongoose_1.default.connection.close();
        process.exit(0);
    }
    catch (error) {
        console.error('[Seeder Error]:', error);
        process.exit(1);
    }
};
seedDefaultCompany();
