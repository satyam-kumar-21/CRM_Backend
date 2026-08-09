import { Schema, model, Document } from 'mongoose';
import { tenantPlugin } from '../plugins/tenantPlugin';

export interface IMessage extends Document {
  companyId: Schema.Types.ObjectId;
  groupId?: Schema.Types.ObjectId;
  senderId: Schema.Types.ObjectId;
  recipientId?: Schema.Types.ObjectId;
  readBy: Schema.Types.ObjectId[];
  content: string;
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
    content: { type: String, required: true, trim: true },
    editedAt: { type: Date },
  },
  { timestamps: true }
);

MessageSchema.plugin(tenantPlugin);

export const Message = model<IMessage>('Message', MessageSchema);
