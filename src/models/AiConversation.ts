import { Schema, model, Document, Types } from 'mongoose';
import { tenantPlugin } from '../plugins/tenantPlugin';
import { AiConversationStatus } from '../types/ai';

export interface IAiConversation extends Document {
  companyId: Types.ObjectId;
  connectionId?: Types.ObjectId;
  campaignName?: string;
  knowledgeBaseId?: Types.ObjectId;
  jivoChatId?: string;
  customerId?: string;
  customerProfile: Record<string, any>;
  messages: Array<{
    role: 'user' | 'assistant' | 'system';
    content: string;
    timestamp: Date;
    metadata?: Record<string, any>;
  }>;
  status: AiConversationStatus;
  leadReady: boolean;
  handoffRequired: boolean;
  leadId?: Types.ObjectId;
  activeGroupId?: Types.ObjectId;
  source: 'JIVO_CHAT';
  knowledgeUsed: string[];
  lastError?: string;
  createdAt: Date;
  updatedAt: Date;
}

const AiConversationSchema = new Schema<IAiConversation>(
  {
    connectionId: { type: Schema.Types.ObjectId, ref: 'AiConnection' },
    campaignName: { type: String, trim: true },
    knowledgeBaseId: { type: Schema.Types.ObjectId, ref: 'AiKnowledgeBase' },
    jivoChatId: { type: String, trim: true },
    customerId: { type: String, trim: true },
    customerProfile: { type: Schema.Types.Mixed, default: {} },
    messages: [
      {
        role: { type: String, enum: ['user', 'assistant', 'system'], required: true },
        content: { type: String, required: true },
        timestamp: { type: Date, default: Date.now },
        metadata: { type: Schema.Types.Mixed, default: {} },
      }
    ],
    status: { type: String, enum: ['AI_ACTIVE', 'AI_TO_HUMAN', 'HUMAN', 'CLOSED'], default: 'AI_ACTIVE' },
    leadReady: { type: Boolean, default: false },
    handoffRequired: { type: Boolean, default: false },
    leadId: { type: Schema.Types.ObjectId, ref: 'Lead' },
    activeGroupId: { type: Schema.Types.ObjectId, ref: 'Group' },
    source: { type: String, enum: ['JIVO_CHAT'], default: 'JIVO_CHAT' },
    knowledgeUsed: [{ type: String }],
    lastError: { type: String, default: '' },
  },
  { timestamps: true }
);

AiConversationSchema.plugin(tenantPlugin);
AiConversationSchema.index({ companyId: 1, jivoChatId: 1 }, { unique: true, sparse: true });

export const AiConversation = model<IAiConversation>('AiConversation', AiConversationSchema);
