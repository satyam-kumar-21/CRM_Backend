"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.LoginOtp = void 0;
const mongoose_1 = require("mongoose");
const LoginOtpSchema = new mongoose_1.Schema({
    otpToken: { type: String, required: true, unique: true, index: true },
    employeeId: { type: mongoose_1.Schema.Types.ObjectId, ref: 'Employee', required: true },
    companyId: { type: mongoose_1.Schema.Types.ObjectId, ref: 'Company', required: true },
    otpHash: { type: String, required: true },
    email: { type: String, required: true },
    expiresAt: { type: Date, required: true, index: { expireAfterSeconds: 0 } },
    attempts: { type: Number, default: 0 },
}, { timestamps: true });
exports.LoginOtp = (0, mongoose_1.model)('LoginOtp', LoginOtpSchema);
