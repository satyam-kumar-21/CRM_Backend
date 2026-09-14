import { Schema, model, Document, Types } from 'mongoose';
import { tenantPlugin } from '../plugins/tenantPlugin';

export interface IAiKnowledgeChunk extends Document {
  companyId: Types.ObjectId;
  knowledgeBaseId: Types.ObjectId;
  fileName: string;
  sourceType: 'uploaded';
  chunkIndex: number;
  content: string;
  embedding: number[];
  metadata?: Record<string, any>;
  createdAt: Date;
  updatedAt: Date;
}

const AiKnowledgeChunkSchema = new Schema<IAiKnowledgeChunk>(
  {
    knowledgeBaseId: { type: Schema.Types.ObjectId, ref: 'AiKnowledgeBase', required: true },
    fileName: { type: String, required: true, trim: true },
    sourceType: { type: String, enum: ['uploaded'], default: 'uploaded' },
    chunkIndex: { type: Number, required: true },
    content: { type: String, required: true },
    embedding: { type: [Number], default: [] },
    metadata: { type: Schema.Types.Mixed, default: {} },
  },
  { timestamps: true }
);

AiKnowledgeChunkSchema.plugin(tenantPlugin);

export const AiKnowledgeChunk = model<IAiKnowledgeChunk>('AiKnowledgeChunk', AiKnowledgeChunkSchema);
