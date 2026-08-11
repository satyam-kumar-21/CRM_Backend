import { Schema, model, Document } from 'mongoose';
import { tenantPlugin } from '../plugins/tenantPlugin';

export type PaymentMethod = 'Card' | 'Check' | 'Wire Transfer' | 'Cash' | 'Other';

export interface ISale extends Document {
  companyId: Schema.Types.ObjectId;
  leadId?: Schema.Types.ObjectId;
  name: string;
  country: string;
  system: string;
  connectedBy: string;
  amount: number;
  paymentMethod: PaymentMethod;
  saleDate: string;
  failed: boolean;
  failedReason: string;
  failedAt?: Date | null;
  failedBy?: Schema.Types.ObjectId | null;
  failedByName: string;
  createdAt: Date;
  updatedAt: Date;
}

const SaleSchema = new Schema<ISale>(
  {
    leadId: { type: Schema.Types.ObjectId, ref: 'Lead' },
    name: { type: String, required: true, trim: true },
    country: { type: String, required: true, trim: true },
    system: { type: String, required: true, trim: true },
    connectedBy: { type: String, required: true, trim: true },
    amount: { type: Number, required: true, min: 0 },
    paymentMethod: { type: String, enum: ['Card', 'Check', 'Wire Transfer', 'Cash', 'Other'], required: true },
    saleDate: { type: String, required: true },
    failed: { type: Boolean, default: false },
    failedReason: { type: String, default: 'N/A' },
    failedAt: { type: Date, default: null },
    failedBy: { type: Schema.Types.ObjectId, ref: 'Employee', default: null },
    failedByName: { type: String, default: 'N/A' },
  },
  { timestamps: true }
);

SaleSchema.plugin(tenantPlugin);
SaleSchema.index({ companyId: 1, leadId: 1 }, { unique: true, sparse: true });
export const Sale = model<ISale>('Sale', SaleSchema);
