import { Schema, model, Document } from 'mongoose';
import { CompanyStatus, SubscriptionPlan } from '../constants/index';

export interface ICompany extends Document {
  companyIdString: string;
  companyCode: string;
  name: string;
  email: string;
  phone: string;
  logo?: string;
  status: CompanyStatus;
  plan: SubscriptionPlan;
  storageLimitMB: number;
  storageUsedMB: number;
  employeeLimit: number;
  branchLimit: number;
  planExpiryDate: Date;
  createdAt: Date;
  updatedAt: Date;
}

const CompanySchema = new Schema<ICompany>(
  {
    companyIdString: { type: String, required: true, unique: true, index: true },
    companyCode: { type: String, required: true, unique: true, uppercase: true, trim: true, index: true },
    name: { type: String, required: true, trim: true },
    email: { type: String, required: true, unique: true, lowercase: true, trim: true },
    phone: { type: String, required: true },
    logo: { type: String, default: '' },
    status: { type: String, enum: Object.values(CompanyStatus), default: CompanyStatus.ACTIVE },
    plan: { type: String, enum: Object.values(SubscriptionPlan), default: SubscriptionPlan.BASIC },
    storageLimitMB: { type: Number, default: 5120 },
    storageUsedMB: { type: Number, default: 0 },
    employeeLimit: { type: Number, default: 50 },
    branchLimit: { type: Number, default: 2 },
    planExpiryDate: { type: Date, required: true },
  },
  { timestamps: true }
);

export const Company = model<ICompany>('Company', CompanySchema);