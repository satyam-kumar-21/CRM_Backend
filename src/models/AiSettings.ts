import { Schema, model, Document, Types } from 'mongoose';
import { tenantPlugin } from '../plugins/tenantPlugin';

export interface IAiSettings extends Document {
  companyId: Types.ObjectId;
  activeModel: string;
  modelEndpoint: string;
  temperature: number;
  maxContext: number;
  retrievalCount: number;
  similarityThreshold: number;
  conversationHistoryLength: number;
  defaultSystemPrompt: string;
  humanHandoffRules: Record<string, any>;
  leadCompletionRules: Record<string, any>;
  campaignOverrides: Record<string, any>;
  createdAt: Date;
  updatedAt: Date;
}

const AiSettingsSchema = new Schema<IAiSettings>(
  {
    activeModel: { type: String, default: 'llama3.1' },
    modelEndpoint: { type: String, default: 'http://localhost:11434/api/generate' },
    temperature: { type: Number, default: 0.3 },
    maxContext: { type: Number, default: 4000 },
    retrievalCount: { type: Number, default: 5 },
    similarityThreshold: { type: Number, default: 0.2 },
    conversationHistoryLength: { type: Number, default: 20 },
    defaultSystemPrompt: {
      type: String,
      default:
        'You are an AI customer support and sales assistant for this campaign. Answer using only the provided knowledge base. If the answer is not in the knowledge base, admit that you do not know and request a human handoff when appropriate.',
    },
    humanHandoffRules: { type: Schema.Types.Mixed, default: {} },
    leadCompletionRules: { type: Schema.Types.Mixed, default: {} },
    campaignOverrides: { type: Schema.Types.Mixed, default: {} },
  },
  { timestamps: true }
);

AiSettingsSchema.plugin(tenantPlugin);

export const AiSettings = model<IAiSettings>('AiSettings', AiSettingsSchema);
