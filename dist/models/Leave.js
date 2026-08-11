"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.Leave = void 0;
const mongoose_1 = require("mongoose");
const index_1 = require("../constants/index");
const tenantPlugin_1 = require("../plugins/tenantPlugin");
const LeaveSchema = new mongoose_1.Schema({
    employeeId: { type: mongoose_1.Schema.Types.ObjectId, ref: 'Employee', required: true },
    leaveType: { type: String, enum: ['CASUAL', 'SICK', 'MATERNITY', 'ANNUAL'], required: true },
    startDate: { type: Date, required: true },
    endDate: { type: Date, required: true },
    reason: { type: String, required: true },
    status: { type: String, enum: Object.values(index_1.LeaveStatus), default: index_1.LeaveStatus.PENDING },
    approvedBy: { type: mongoose_1.Schema.Types.ObjectId, ref: 'Employee' },
    approvedByName: { type: String, default: '' },
    rejectedBy: { type: mongoose_1.Schema.Types.ObjectId, ref: 'Employee' },
    rejectedByName: { type: String, default: '' },
    rejectReason: { type: String, default: '' },
}, { timestamps: true });
LeaveSchema.plugin(tenantPlugin_1.tenantPlugin);
exports.Leave = (0, mongoose_1.model)('Leave', LeaveSchema);
