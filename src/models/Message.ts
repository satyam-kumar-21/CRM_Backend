import { Schema, model, Document } from 'mongoose';
import { tenantPlugin } from '../plugins/tenantPlugin';

export type MessageType = 'TEXT' | 'IMAGE' | 'FILE' | 'AUDIO';

export interface IMessage extends Document {
  companyId: Schema.Types.ObjectId;
  groupId?: Schema.Types.ObjectId;
  senderId: Schema.Types.ObjectId;
  recipientId?: Schema.Types.ObjectId;
  readBy: Schema.Types.ObjectId[];
  content: string;
  messageType: MessageType;
  fileName?: string;
  mimeType?: string;
  objectKey?: string;
  fileSize?: number;
  duration?: number;
  createdAt: Date;
  updatedAt: Date;
  editedAt?: Date;
}

const MessageSchema = new Schema<IMessage>(
  {
    groupId: { type: Schema.Types.ObjectId, ref: 'Group' },
    senderId: { type: Schema.Types.ObjectId, ref: 'Employee', required: true },
    recipientId: { type: Schema.Types.ObjectId, ref: 'Employee' },
    readBy: [{ type: Schema.Types.ObjectId, ref: 'Employee' }],
    content: { type: String, required: true, trim: true, default: '' },
    messageType: { type: String, enum: ['TEXT', 'IMAGE', 'FILE', 'AUDIO'], default: 'TEXT' },
    fileName: { type: String, trim: true },
    mimeType: { type: String, trim: true },
    objectKey: { type: String, trim: true },
    fileSize: { type: Number },
    duration: { type: Number },
    editedAt: { type: Date },
  },
  { timestamps: true }
);

MessageSchema.plugin(tenantPlugin);

export const Message = model<IMessage>('Message', MessageSchema);
