import { Schema, model, Document, Types } from 'mongoose';

export interface ILoginOtp extends Document {
  otpToken: string;
  employeeId: Types.ObjectId;
  companyId: Types.ObjectId;
  otpHash: string;
  email: string;
  expiresAt: Date;
  attempts: number;
  createdAt: Date;
}

const LoginOtpSchema = new Schema<ILoginOtp>(
  {
    otpToken: { type: String, required: true, unique: true, index: true },
    employeeId: { type: Schema.Types.ObjectId, ref: 'Employee', required: true },
    companyId: { type: Schema.Types.ObjectId, ref: 'Company', required: true },
    otpHash: { type: String, required: true },
    email: { type: String, required: true },
    expiresAt: { type: Date, required: true, index: { expireAfterSeconds: 0 } },
    attempts: { type: Number, default: 0 },
  },
  { timestamps: true },
);

export const LoginOtp = model<ILoginOtp>('LoginOtp', LoginOtpSchema);
