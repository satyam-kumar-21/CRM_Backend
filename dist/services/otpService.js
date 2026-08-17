"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.OtpService = void 0;
const bcrypt_1 = __importDefault(require("bcrypt"));
const crypto_1 = __importDefault(require("crypto"));
const LoginOtp_1 = require("../models/LoginOtp");
const emailService_1 = require("../utils/emailService");
const mongoose_1 = require("mongoose");
const MAX_ATTEMPTS = 5;
const generateOtp = () => String(Math.floor(100000 + Math.random() * 900000));
class OtpService {
    static async createAndSendLoginOtp(employeeId, companyId, email, name) {
        const otp = generateOtp();
        const otpToken = crypto_1.default.randomBytes(32).toString('hex');
        const otpHash = await bcrypt_1.default.hash(otp, 10);
        const expiryMinutes = Number(process.env.OTP_EXPIRY_MINUTES || 10);
        const expiresAt = new Date(Date.now() + expiryMinutes * 60 * 1000);
        await LoginOtp_1.LoginOtp.deleteMany({ employeeId: new mongoose_1.Types.ObjectId(employeeId) });
        await LoginOtp_1.LoginOtp.create({
            otpToken,
            employeeId: new mongoose_1.Types.ObjectId(employeeId),
            companyId: new mongoose_1.Types.ObjectId(companyId),
            otpHash,
            email: email.toLowerCase(),
            expiresAt,
            attempts: 0,
        });
        await (0, emailService_1.sendLoginOtpEmail)(email, otp, name);
        return { otpToken, maskedEmail: (0, emailService_1.maskEmail)(email) };
    }
    static async verifyLoginOtp(otpToken, otp) {
        const session = await LoginOtp_1.LoginOtp.findOne({ otpToken });
        if (!session) {
            throw { statusCode: 401, message: 'OTP session expired or invalid. Please login again.' };
        }
        if (session.expiresAt < new Date()) {
            await LoginOtp_1.LoginOtp.deleteOne({ _id: session._id });
            throw { statusCode: 401, message: 'OTP has expired. Please login again.' };
        }
        if (session.attempts >= MAX_ATTEMPTS) {
            await LoginOtp_1.LoginOtp.deleteOne({ _id: session._id });
            throw { statusCode: 401, message: 'Too many failed OTP attempts. Please login again.' };
        }
        const isValid = await bcrypt_1.default.compare(otp.trim(), session.otpHash);
        if (!isValid) {
            session.attempts += 1;
            await session.save();
            throw { statusCode: 401, message: 'Invalid OTP. Please try again.' };
        }
        await LoginOtp_1.LoginOtp.deleteOne({ _id: session._id });
        return { employeeId: session.employeeId.toString(), companyId: session.companyId.toString() };
    }
}
exports.OtpService = OtpService;
