import { Schema, model, Document } from 'mongoose';
import { Roles } from '../constants/index';
import { tenantPlugin } from '../plugins/tenantPlugin';

export interface IEmployee extends Document {
  companyId: Schema.Types.ObjectId;
  employeeId: string;
  name: string;
  email?: string;
  passwordHash: string;
  phone: string;
  avatar?: string;
  role: Roles;
  permissions: string[];
  monthlySalesTarget?: number;
  monthlySalesAchieved?: number;
  leadsAssigned?: number;
  leadsConverted?: number;
  remoteTarget?: number;
  salaryAmount: number;
  salaryMonth?: string;
  salaryCredited: boolean;
  teamId?: Schema.Types.ObjectId;
  isSuspended: boolean;
  refreshTokens: string[];
  createdAt: Date;
  updatedAt: Date;
}

const EmployeeSchema = new Schema<IEmployee>(
  {
    employeeId: { type: String, required: true, trim: true },
    name: { type: String, required: true, trim: true },
    email: { type: String, required: false, trim: true, lowercase: true },
    passwordHash: { type: String, required: true },
    phone: { type: String, required: true },
    avatar: { type: String, default: '' },
    role: { type: String, enum: Object.values(Roles), default: Roles.EMPLOYEE },
    permissions: { type: [String], default: [] },
    monthlySalesTarget: { type: Number, default: 0 },
    monthlySalesAchieved: { type: Number, default: 0 },
    leadsAssigned: { type: Number, default: 0 },
    leadsConverted: { type: Number, default: 0 },
    remoteTarget: { type: Number, default: 0 },
    salaryAmount: { type: Number, default: 0 },
    salaryMonth: { type: String, default: '' },
    salaryCredited: { type: Boolean, default: false },
    teamId: { type: Schema.Types.ObjectId, ref: 'Team' },
    isSuspended: { type: Boolean, default: false },
    refreshTokens: [{ type: String }],
  },
  { timestamps: true }
);

EmployeeSchema.index({ companyId: 1, email: 1 }, { unique: true, sparse: true });
EmployeeSchema.index({ companyId: 1, employeeId: 1 }, { unique: true });
EmployeeSchema.plugin(tenantPlugin);

export const Employee = model<IEmployee>('Employee', EmployeeSchema);