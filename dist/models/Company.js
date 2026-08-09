"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.Company = void 0;
const mongoose_1 = require("mongoose");
const index_1 = require("../constants/index");
const CompanySchema = new mongoose_1.Schema({
    companyIdString: { type: String, required: true, unique: true, index: true },
    companyCode: { type: String, required: true, unique: true, uppercase: true, trim: true, index: true },
    name: { type: String, required: true, trim: true },
    email: { type: String, required: true, unique: true, lowercase: true, trim: true },
    phone: { type: String, required: true },
    logo: { type: String, default: '' },
    status: { type: String, enum: Object.values(index_1.CompanyStatus), default: index_1.CompanyStatus.ACTIVE },
    plan: { type: String, enum: Object.values(index_1.SubscriptionPlan), default: index_1.SubscriptionPlan.BASIC },
    storageLimitMB: { type: Number, default: 5120 },
    storageUsedMB: { type: Number, default: 0 },
    employeeLimit: { type: Number, default: 50 },
    branchLimit: { type: Number, default: 2 },
    planExpiryDate: { type: Date, required: true },
}, { timestamps: true });
exports.Company = (0, mongoose_1.model)('Company', CompanySchema);
