import { Schema, model, Document, Types } from 'mongoose';
import { tenantPlugin } from '../plugins/tenantPlugin';

export type UpgradeStatus = 'PENDING' | 'IN_PROGRESS' | 'SUCCESSFUL' | 'FAILED' | 'COMPLETED';

export interface IUpgrade extends Document {
  companyId: Types.ObjectId;
  customerId: string;
  customerName: string;
  customerEmail?: string;
  mobile?: string;
  country?: string;
  system?: string;
  salesEmployeeId?: Types.ObjectId;
  salesEmployeeName?: string;
  upgradedBy?: Types.ObjectId;
  upgradedByName?: string;
  originalSaleId?: Types.ObjectId;
  saleId?: Types.ObjectId;
  leadId?: Types.ObjectId;
  businessDate?: string;
  upgradeNumber: number;
  upgradeAmount: number;
  salesTaxType: 'PERCENTAGE' | 'DIRECT_AMOUNT';
  salesTaxValue: number;
  salesTaxAmount: number;
  finalAmount: number;
  paymentMethod: 'Card' | 'Check' | 'Wire Transfer' | 'Cash' | 'UPI' | 'Bank Transfer' | 'Online' | 'Other';
  salesEmployeeRemark?: string;
  status: UpgradeStatus;
  techSupportStatus?: 'NONE' | 'PENDING' | 'ACCEPTED' | 'SUCCESSFUL' | 'FAILED';
  techSupportEmployeeId?: Types.ObjectId;
  techSupportEmployeeName?: string;
  verificationStatus?: 'PENDING' | 'IN_PROGRESS' | 'SUCCESSFUL' | 'FAILED';
  verificationEmployeeId?: Types.ObjectId;
  verificationEmployeeName?: string;
  feedbackStatus?: 'PENDING' | 'COMPLETED';
  createdAt: Date;
  updatedAt: Date;
}

const UpgradeSchema = new Schema<IUpgrade>(
  {
    companyId: { type: Schema.Types.ObjectId, required: true, ref: 'Company' },
    customerId: { type: String, required: true, trim: true },
    customerName: { type: String, required: true, trim: true },
    customerEmail: { type: String, default: '', trim: true, lowercase: true },
    mobile: { type: String, default: '', trim: true },
    country: { type: String, default: '', trim: true },
    system: { type: String, default: '', trim: true },
    salesEmployeeId: { type: Schema.Types.ObjectId, ref: 'Employee', default: null },
    salesEmployeeName: { type: String, default: '', trim: true },
    upgradedBy: { type: Schema.Types.ObjectId, ref: 'Employee', default: null },
    upgradedByName: { type: String, default: '', trim: true },
    originalSaleId: { type: Schema.Types.ObjectId, ref: 'Sale', default: null },
    saleId: { type: Schema.Types.ObjectId, ref: 'Sale', default: null },
    leadId: { type: Schema.Types.ObjectId, ref: 'Lead', default: null },
    upgradeNumber: { type: Number, default: 1 },
    upgradeAmount: { type: Number, default: 0 },
    salesTaxType: { type: String, enum: ['PERCENTAGE', 'DIRECT_AMOUNT'], default: 'PERCENTAGE' },
    salesTaxValue: { type: Number, default: 0 },
    salesTaxAmount: { type: Number, default: 0 },
    finalAmount: { type: Number, default: 0 },
    paymentMethod: { type: String, enum: ['Card', 'Check', 'Wire Transfer', 'Cash', 'UPI', 'Bank Transfer', 'Online', 'Other'], default: 'Card' },
    salesEmployeeRemark: { type: String, default: '', trim: true },
    status: { type: String, enum: ['PENDING', 'IN_PROGRESS', 'SUCCESSFUL', 'FAILED', 'COMPLETED'], default: 'PENDING' },
    techSupportStatus: { type: String, enum: ['NONE', 'PENDING', 'ACCEPTED', 'SUCCESSFUL', 'FAILED'], default: 'NONE' },
    techSupportEmployeeId: { type: Schema.Types.ObjectId, ref: 'Employee', default: null },
    techSupportEmployeeName: { type: String, default: '', trim: true },
    verificationStatus: { type: String, enum: ['PENDING', 'IN_PROGRESS', 'SUCCESSFUL', 'FAILED'], default: 'PENDING' },
    verificationEmployeeId: { type: Schema.Types.ObjectId, ref: 'Employee', default: null },
    verificationEmployeeName: { type: String, default: '', trim: true },
    feedbackStatus: { type: String, enum: ['PENDING', 'COMPLETED'], default: 'PENDING' },
  },
  { timestamps: true }
);

UpgradeSchema.plugin(tenantPlugin);
UpgradeSchema.index({ companyId: 1, customerId: 1, upgradeNumber: 1 }, { unique: true, sparse: true });

export const Upgrade = model<IUpgrade>('Upgrade', UpgradeSchema);
