"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.Department = void 0;
const mongoose_1 = require("mongoose");
const tenantPlugin_1 = require("../plugins/tenantPlugin");
const DepartmentSchema = new mongoose_1.Schema({
    name: { type: String, required: true, trim: true },
    description: { type: String, default: '' },
    headEmployeeId: { type: mongoose_1.Schema.Types.ObjectId, ref: 'Employee' },
}, { timestamps: true });
DepartmentSchema.plugin(tenantPlugin_1.tenantPlugin);
exports.Department = (0, mongoose_1.model)('Department', DepartmentSchema);
