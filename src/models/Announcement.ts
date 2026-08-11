import { Schema, model, Document } from 'mongoose';
import { tenantPlugin } from '../plugins/tenantPlugin';

export interface IAnnouncement extends Document {
  companyId: Schema.Types.ObjectId;
  title: string;
  content: string;
  authorId: Schema.Types.ObjectId;
  targetRoles: string[];
  readBy: Schema.Types.ObjectId[];
  createdAt: Date;
  updatedAt: Date;
}

const AnnouncementSchema = new Schema<IAnnouncement>(
  {
    title: { type: String, required: true, trim: true },
    content: { type: String, required: true },
    authorId: { type: Schema.Types.ObjectId, ref: 'Employee', required: true },
    targetRoles: [{ type: String }],
    readBy: [{ type: Schema.Types.ObjectId, ref: 'Employee', default: [] }],
  },
  { timestamps: true }
);

AnnouncementSchema.plugin(tenantPlugin);
export const Announcement = model<IAnnouncement>('Announcement', AnnouncementSchema);