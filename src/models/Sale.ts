import { Schema, model, Document, Types } from 'mongoose';
import { tenantPlugin } from '../plugins/tenantPlugin';

export type PaymentMethod = 'Card' | 'Check' | 'Wire Transfer' | 'Cash' | 'UPI' | 'Bank Transfer' | 'Online' | 'Other';

export interface ISale extends Document {
  companyId: Types.ObjectId;
  leadId?: Types.ObjectId;
  customerId?: string;
  name: string;
  customerEmail?: string;
  alternateContactNo?: string;
  customerAddress?: string;
  country: string;
  system: string;
  issues?: string;
  plan?: string;
  paymentMerchant?: string;
  connectedBy: string;
  customerType?: 'NEW' | 'EXISTING_CUSTOMER' | 'UPGRADE';
  salesEmployeeId?: Types.ObjectId;
  salesEmployeeName?: string;
  techSupportEmployeeId?: Types.ObjectId;
  techSupportEmployeeName?: string;
  techSupportCompletedAt?: Date;
  amount: number;
  mainAmount?: number;
  upgradedAmount?: number;
  salesTaxType?: 'PERCENTAGE' | 'DIRECT_AMOUNT';
  salesTaxValue?: number;
  salesTaxAmount?: number;
  finalAmount?: number;
  paymentMethod: PaymentMethod;
  saleDate: string;
  businessDate: string;
  failed: boolean;
  failedReason: string;
  failedAt?: Date | null;
  failedBy?: Types.ObjectId | null;
  failedByName: string;
  salesEmployeeRemark?: string;

  // Verification fields
  verificationStatus: 'PENDING' | 'IN_PROGRESS' | 'SUCCESSFUL' | 'FAILED';
  verificationEmployeeId?: Types.ObjectId | null;
  verificationEmployeeName?: string;
  verifiedBy?: Types.ObjectId | null;
  verifiedByName?: string;
  verifiedAt?: Date | null;
  verificationNotes?: string;
  verificationFailedReason?: string;
  verificationFailedBy?: Types.ObjectId | null;
  verificationFailedByName?: string;
  verificationFailedAt?: Date | null;

  // Feedback fields
  feedbackStatus: 'PENDING' | 'COMPLETED';
  feedbackRating?: 'Positive' | 'Neutral' | 'Negative';
  feedbackNotes?: string;
  feedbackBy?: Types.ObjectId | null;
  feedbackByName?: string;
  feedbackAt?: Date | null;
  feedbackBusinessDate?: string;

  createdAt: Date;
  updatedAt: Date;
}

const SaleSchema = new Schema<ISale>(
  {
    leadId: { type: Schema.Types.ObjectId, ref: 'Lead' },
    customerId: { type: String, trim: true, default: '' },
    name: { type: String, required: true, trim: true },
    customerEmail: { type: String, default: '', trim: true, lowercase: true },
    alternateContactNo: { type: String, default: '', trim: true },
    customerAddress: { type: String, default: '', trim: true },
    country: { type: String, required: true, trim: true },
    system: { type: String, required: true, trim: true },
    issues: { type: String, default: '', trim: true },
    plan: { type: String, default: '', trim: true },
    paymentMerchant: { type: String, default: '', trim: true },
    connectedBy: { type: String, required: true, trim: true },
    customerType: { type: String, enum: ['NEW', 'EXISTING_CUSTOMER', 'UPGRADE'], default: 'NEW' },
    salesEmployeeId: { type: Schema.Types.ObjectId, ref: 'Employee' },
    salesEmployeeName: { type: String, default: '', trim: true },
    techSupportEmployeeId: { type: Schema.Types.ObjectId, ref: 'Employee' },
    techSupportEmployeeName: { type: String, default: '', trim: true },
    techSupportCompletedAt: { type: Date },
    amount: { type: Number, required: true, min: 0 },
    mainAmount: { type: Number, default: 0 },
    upgradedAmount: { type: Number, default: 0 },
    salesTaxType: { type: String, enum: ['PERCENTAGE', 'DIRECT_AMOUNT'], default: 'PERCENTAGE' },
    salesTaxValue: { type: Number, default: 0 },
    salesTaxAmount: { type: Number, default: 0 },
    finalAmount: { type: Number, default: 0 },
    paymentMethod: { type: String, enum: ['Card', 'Check', 'Wire Transfer', 'Cash', 'UPI', 'Bank Transfer', 'Online', 'Other'], required: true },
    saleDate: { type: String, required: true },
    businessDate: { type: String, default: '' },
    failed: { type: Boolean, default: false },
    failedReason: { type: String, default: 'N/A' },
    failedAt: { type: Date, default: null },
    failedBy: { type: Schema.Types.ObjectId, ref: 'Employee', default: null },
    failedByName: { type: String, default: 'N/A' },
    salesEmployeeRemark: { type: String, default: '', trim: true },

    // Verification schema
    verificationStatus: { type: String, enum: ['PENDING', 'IN_PROGRESS', 'SUCCESSFUL', 'FAILED'], default: 'PENDING' },
    verificationEmployeeId: { type: Schema.Types.ObjectId, ref: 'Employee', default: null },
    verificationEmployeeName: { type: String, default: '', trim: true },
    verifiedBy: { type: Schema.Types.ObjectId, ref: 'Employee', default: null },
    verifiedByName: { type: String, default: '' },
    verifiedAt: { type: Date, default: null },
    verificationNotes: { type: String, default: '' },
    verificationFailedReason: { type: String, default: '' },
    verificationFailedBy: { type: Schema.Types.ObjectId, ref: 'Employee', default: null },
    verificationFailedByName: { type: String, default: '' },
    verificationFailedAt: { type: Date, default: null },

    // Feedback schema
    feedbackStatus: { type: String, enum: ['PENDING', 'COMPLETED'], default: 'PENDING' },
    feedbackRating: { type: String, enum: ['Positive', 'Neutral', 'Negative'] },
    feedbackNotes: { type: String, default: '' },
    feedbackBy: { type: Schema.Types.ObjectId, ref: 'Employee', default: null },
    feedbackByName: { type: String, default: '' },
    feedbackAt: { type: Date, default: null },
    feedbackBusinessDate: { type: String, default: '' },
  },
  { timestamps: true }
);

SaleSchema.plugin(tenantPlugin);
SaleSchema.index({ companyId: 1, leadId: 1 }, { unique: true, sparse: true });
export const Sale = model<ISale>('Sale', SaleSchema);
