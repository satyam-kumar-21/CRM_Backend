import { Schema, model, Document, Types } from 'mongoose';
import { tenantPlugin } from '../plugins/tenantPlugin';

export interface ILead extends Document {
  companyId: Types.ObjectId;
  name: string;
  country: string;
  system: string;
  contactNo: string;
  otherDetails: string;
  customerEmail?: string;
  alternateContactNo?: string;
  customerAddress?: string;
  issues?: string;
  plan?: string;
  paymentMerchant?: string;
  connected: 'yes' | 'no';
  connectedBy: string;
  assignedTo?: Types.ObjectId;
  assignedToName?: string;
  acceptedAt?: Date;
  isSale: 'yes' | 'no';
  // Amount captured right after isSale=yes (before tech support)
  saleAmount?: number;
  salePaymentMethod?: 'Card' | 'Check' | 'Wire Transfer' | 'Cash' | 'UPI' | 'Bank Transfer' | 'Online' | 'Other';
  techSupportStatus?: 'NONE' | 'PENDING' | 'ACCEPTED' | 'SUCCESSFUL' | 'FAILED';
  techSupportEmployeeId?: Types.ObjectId;
  techSupportEmployeeName?: string;
  techSupportCompletedAt?: Date;
  // Final payment confirmation by sales after tech support (or if no tech support needed)
  paymentConfirmed?: 'yes' | 'no';
  finalStatus?: 'PENDING_PAYMENT' | 'CLOSED' | 'PAYMENT_FAILED';
  status: 'OPEN' | 'COMPLETED';
  completionReason?: string;
  workflowMessageId?: string;
  createdAt: Date;
  updatedAt: Date;
}

const LeadSchema = new Schema<ILead>(
  {
    name: { type: String, required: true, trim: true },
    country: { type: String, required: true, trim: true },
    system: { type: String, required: true, trim: true },
    contactNo: { type: String, required: true, trim: true },
    otherDetails: { type: String, default: '', trim: true },
    customerEmail: { type: String, default: '', trim: true, lowercase: true },
    alternateContactNo: { type: String, default: '', trim: true },
    customerAddress: { type: String, default: '', trim: true },
    issues: { type: String, default: '', trim: true },
    plan: { type: String, default: '', trim: true },
    paymentMerchant: { type: String, default: '', trim: true },
    connected: { type: String, enum: ['yes', 'no'], default: 'no' },
    connectedBy: { type: String, required: true, trim: true },
    assignedTo: { type: Schema.Types.ObjectId, ref: 'Employee' },
    assignedToName: { type: String, default: '', trim: true },
    acceptedAt: { type: Date },
    isSale: { type: String, enum: ['yes', 'no'], default: 'no' },
    saleAmount: { type: Number },
    salePaymentMethod: { type: String, enum: ['Card', 'Check', 'Wire Transfer', 'Cash', 'UPI', 'Bank Transfer', 'Online', 'Other'] },
    techSupportStatus: { type: String, enum: ['NONE', 'PENDING', 'ACCEPTED', 'SUCCESSFUL', 'FAILED'], default: 'NONE' },
    techSupportEmployeeId: { type: Schema.Types.ObjectId, ref: 'Employee' },
    techSupportEmployeeName: { type: String, default: '', trim: true },
    techSupportCompletedAt: { type: Date },
    paymentConfirmed: { type: String, enum: ['yes', 'no'] },
    finalStatus: { type: String, enum: ['PENDING_PAYMENT', 'CLOSED', 'PAYMENT_FAILED'] },
    status: { type: String, enum: ['OPEN', 'COMPLETED'], default: 'OPEN' },
    completionReason: { type: String, default: '' },
    workflowMessageId: { type: String, trim: true },
  },
  { timestamps: true }
);

LeadSchema.plugin(tenantPlugin);
LeadSchema.index({ companyId: 1, workflowMessageId: 1 }, { unique: true, sparse: true });
export const Lead = model<ILead>('Lead', LeadSchema);
