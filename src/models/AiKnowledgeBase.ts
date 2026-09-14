import { Schema, model, Document, Types } from 'mongoose';
import { tenantPlugin } from '../plugins/tenantPlugin';

export interface IAiKnowledgeBase extends Document {
  companyId: Types.ObjectId;
  name: string;
  description?: string;
  campaignId?: Types.ObjectId;
  connectedCampaign?: string;
  isActive: boolean;
  sourceCount: number;
  lastIndexedAt?: Date;
  createdBy?: Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
}

const AiKnowledgeBaseSchema = new Schema<IAiKnowledgeBase>(
  {
    name: { type: String, required: true, trim: true },
    description: { type: String, default: '', trim: true },
    campaignId: { type: Schema.Types.ObjectId, ref: 'AiConnection' },
    connectedCampaign: { type: String, trim: true },
    isActive: { type: Boolean, default: true },
    sourceCount: { type: Number, default: 0 },
    lastIndexedAt: { type: Date },
    createdBy: { type: Schema.Types.ObjectId, ref: 'Employee' },
  },
  { timestamps: true }
);

AiKnowledgeBaseSchema.plugin(tenantPlugin);

export const AiKnowledgeBase = model<IAiKnowledgeBase>('AiKnowledgeBase', AiKnowledgeBaseSchema);
