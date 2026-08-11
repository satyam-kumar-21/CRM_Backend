"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.Attendance = void 0;
const mongoose_1 = require("mongoose");
const index_1 = require("../constants/index");
const tenantPlugin_1 = require("../plugins/tenantPlugin");
const AttendanceSchema = new mongoose_1.Schema({
    employeeId: { type: mongoose_1.Schema.Types.ObjectId, ref: 'Employee', required: true },
    date: { type: Date, required: true },
    checkIn: { type: Date },
    checkOut: { type: Date },
    status: { type: String, enum: Object.values(index_1.AttendanceStatus), default: index_1.AttendanceStatus.ABSENT },
    workHours: { type: Number, default: 0 },
}, { timestamps: true });
AttendanceSchema.plugin(tenantPlugin_1.tenantPlugin);
exports.Attendance = (0, mongoose_1.model)('Attendance', AttendanceSchema);
