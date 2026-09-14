import { Schema, model, Document, Types } from 'mongoose';
import { tenantPlugin } from '../plugins/tenantPlugin';

export interface IAiConnection extends Document {
  companyId: Types.ObjectId;
  name: string;
  siteId?: string;
  channelId?: string;
  providerId?: string;
  apiEndpoint?: string;
  apiTokenEncrypted?: string;
  webhookSecretEncrypted?: string;
  connectedCampaign?: string;
  campaignId?: Types.ObjectId;
  salesGroupId?: Types.ObjectId;
  isActive: boolean;
  webhookStatus: 'ACTIVE' | 'INACTIVE';
  status: 'ACTIVE' | 'INACTIVE' | 'PENDING';
  lastValidatedAt?: Date;
  validationNotes?: string[];
  createdAt: Date;
  updatedAt: Date;
}

const AiConnectionSchema = new Schema<IAiConnection>(
  {
    name: { type: String, required: true, trim: true },
    siteId: { type: String, trim: true },
    channelId: { type: String, trim: true },
    providerId: { type: String, trim: true },
    apiEndpoint: { type: String, trim: true },
    apiTokenEncrypted: { type: String, default: '' },
    webhookSecretEncrypted: { type: String, default: '' },
    connectedCampaign: { type: String, trim: true },
    campaignId: { type: Schema.Types.ObjectId, ref: 'AiKnowledgeBase' },
    salesGroupId: { type: Schema.Types.ObjectId, ref: 'Group' },
    isActive: { type: Boolean, default: true },
    webhookStatus: { type: String, enum: ['ACTIVE', 'INACTIVE'], default: 'INACTIVE' },
    status: { type: String, enum: ['ACTIVE', 'INACTIVE', 'PENDING'], default: 'PENDING' },
    lastValidatedAt: { type: Date },
    validationNotes: [{ type: String }],
  },
  { timestamps: true }
);

AiConnectionSchema.plugin(tenantPlugin);

export const AiConnection = model<IAiConnection>('AiConnection', AiConnectionSchema);
