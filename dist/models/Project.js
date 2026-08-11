"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.Project = void 0;
const mongoose_1 = require("mongoose");
const tenantPlugin_1 = require("../plugins/tenantPlugin");
const ProjectSchema = new mongoose_1.Schema({
    name: { type: String, required: true, trim: true },
    description: { type: String, required: true },
    status: { type: String, enum: ['PLANNING', 'IN_PROGRESS', 'COMPLETED', 'ON_HOLD'], default: 'PLANNING' },
    assignedEmployees: [{ type: mongoose_1.Schema.Types.ObjectId, ref: 'Employee' }],
    startDate: { type: Date, required: true },
    endDate: { type: Date, required: true },
    progress: { type: Number, default: 0 },
    createdBy: { type: mongoose_1.Schema.Types.ObjectId, ref: 'Employee', required: true },
}, { timestamps: true });
ProjectSchema.plugin(tenantPlugin_1.tenantPlugin);
exports.Project = (0, mongoose_1.model)('Project', ProjectSchema);
