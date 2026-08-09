import { Schema, model, Document } from 'mongoose';
import { tenantPlugin } from '../plugins/tenantPlugin';

export interface INotification extends Document {
  companyId: Schema.Types.ObjectId;
  recipientId: Schema.Types.ObjectId;
  title: string;
  message: string;
  isRead: boolean;
  link?: string;
}

const NotificationSchema = new Schema<INotification>(
  {
    recipientId: { type: Schema.Types.ObjectId, ref: 'Employee', required: true },
    title: { type: String, required: true },
    message: { type: String, required: true },
    isRead: { type: Boolean, default: false },
    link: { type: String, default: '' },
  },
  { timestamps: true }
);

NotificationSchema.plugin(tenantPlugin);
export const Notification = model<INotification>('Notification', NotificationSchema);