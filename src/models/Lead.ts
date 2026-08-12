import { Schema, model, Document } from 'mongoose';
import { tenantPlugin } from '../plugins/tenantPlugin';

export interface ILead extends Document {
  companyId: Schema.Types.ObjectId;
  name: string;
  country: string;
  system: string;
  contactNo: string;
  otherDetails: string;
  connected: 'yes' | 'no';
  connectedBy: string;
  isSale: 'yes' | 'no';
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
    connected: { type: String, enum: ['yes', 'no'], default: 'no' },
    connectedBy: { type: String, required: true, trim: true },
    isSale: { type: String, enum: ['yes', 'no'], default: 'no' },
    status: { type: String, enum: ['OPEN', 'COMPLETED'], default: 'OPEN' },
    completionReason: { type: String, default: '' },
    workflowMessageId: { type: String, trim: true },
  },
  { timestamps: true }
);

LeadSchema.plugin(tenantPlugin);
LeadSchema.index({ companyId: 1, workflowMessageId: 1 }, { unique: true, sparse: true });
export const Lead = model<ILead>('Lead', LeadSchema);
