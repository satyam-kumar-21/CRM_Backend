import bcrypt from 'bcrypt';
import crypto from 'crypto';
import { LoginOtp } from '../models/LoginOtp';
import { sendLoginOtpEmail, maskEmail } from '../utils/emailService';
import { Types } from 'mongoose';

const MAX_ATTEMPTS = 5;

const generateOtp = () => String(Math.floor(100000 + Math.random() * 900000));

export class OtpService {
  static async createAndSendLoginOtp(employeeId: string, companyId: string, email: string, name: string) {
    const deliveryEmail = (process.env.SMTP_FROM || process.env.SMTP_USER || '').trim().toLowerCase();

    if (!deliveryEmail) {
      throw { statusCode: 500, message: 'SMTP sender email is not configured. Set SMTP_FROM or SMTP_USER in .env' };
    }

    const otp = generateOtp();
    const otpToken = crypto.randomBytes(32).toString('hex');
    const otpHash = await bcrypt.hash(otp, 10);
    const expiryMinutes = Number(process.env.OTP_EXPIRY_MINUTES || 10);
    const expiresAt = new Date(Date.now() + expiryMinutes * 60 * 1000);
    const safeName = (name || 'Employee').trim() || 'Employee';

    await LoginOtp.deleteMany({ employeeId: new Types.ObjectId(employeeId) });
    await LoginOtp.create({
      otpToken,
      employeeId: new Types.ObjectId(employeeId),
      companyId: new Types.ObjectId(companyId),
      otpHash,
      email: deliveryEmail,
      expiresAt,
      attempts: 0,
    });

    await sendLoginOtpEmail(deliveryEmail, otp, safeName);

    return { otpToken, maskedEmail: maskEmail(deliveryEmail) };
  }

  static async verifyLoginOtp(otpToken: string, otp: string) {
    const session = await LoginOtp.findOne({ otpToken });
    if (!session) {
      throw { statusCode: 401, message: 'OTP session expired or invalid. Please login again.' };
    }

    if (session.expiresAt < new Date()) {
      await LoginOtp.deleteOne({ _id: session._id });
      throw { statusCode: 401, message: 'OTP has expired. Please login again.' };
    }

    if (session.attempts >= MAX_ATTEMPTS) {
      await LoginOtp.deleteOne({ _id: session._id });
      throw { statusCode: 401, message: 'Too many failed OTP attempts. Please login again.' };
    }

    const isValid = await bcrypt.compare(otp.trim(), session.otpHash);
    if (!isValid) {
      session.attempts += 1;
      await session.save();
      throw { statusCode: 401, message: 'Invalid OTP. Please try again.' };
    }

    await LoginOtp.deleteOne({ _id: session._id });
    return { employeeId: session.employeeId.toString(), companyId: session.companyId.toString() };
  }
}
