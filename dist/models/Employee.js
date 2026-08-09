"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.Employee = void 0;
const mongoose_1 = require("mongoose");
const index_1 = require("../constants/index");
const tenantPlugin_1 = require("../plugins/tenantPlugin");
const EmployeeSchema = new mongoose_1.Schema({
    employeeId: { type: String, required: true, trim: true },
    name: { type: String, required: true, trim: true },
    email: { type: String, required: false, trim: true, lowercase: true },
    passwordHash: { type: String, required: true },
    phone: { type: String, required: true },
    avatar: { type: String, default: '' },
    role: { type: String, enum: Object.values(index_1.Roles), default: index_1.Roles.EMPLOYEE },
    permissions: { type: [String], default: [] },
    monthlySalesTarget: { type: Number, default: 0 },
    monthlySalesAchieved: { type: Number, default: 0 },
    leadsAssigned: { type: Number, default: 0 },
    leadsConverted: { type: Number, default: 0 },
    remoteTarget: { type: Number, default: 0 },
    teamId: { type: mongoose_1.Schema.Types.ObjectId, ref: 'Team' },
    isSuspended: { type: Boolean, default: false },
    refreshTokens: [{ type: String }],
}, { timestamps: true });
EmployeeSchema.index({ companyId: 1, email: 1 }, { unique: true, sparse: true });
EmployeeSchema.index({ companyId: 1, employeeId: 1 }, { unique: true });
EmployeeSchema.plugin(tenantPlugin_1.tenantPlugin);
exports.Employee = (0, mongoose_1.model)('Employee', EmployeeSchema);
