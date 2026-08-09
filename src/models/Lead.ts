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
  },
  { timestamps: true }
);

LeadSchema.plugin(tenantPlugin);
export const Lead = model<ILead>('Lead', LeadSchema);
