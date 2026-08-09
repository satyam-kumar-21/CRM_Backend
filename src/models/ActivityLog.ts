import { Schema, model, Document } from 'mongoose';

export interface IActivityLog extends Document {
  companyId?: Schema.Types.ObjectId;
  userId: Schema.Types.ObjectId;
  userModel: 'SuperAdmin' | 'Employee';
  action: string;
  module: string;
  ipAddress: string;
  userAgent: string;
}

const ActivityLogSchema = new Schema<IActivityLog>(
  {
    companyId: { type: Schema.Types.ObjectId, ref: 'Company' },
    userId: { type: Schema.Types.ObjectId, required: true, refPath: 'userModel' },
    userModel: { type: String, required: true, enum: ['SuperAdmin', 'Employee'] },
    action: { type: String, required: true },
    module: { type: String, required: true },
    ipAddress: { type: String, default: '' },
    userAgent: { type: String, default: '' },
  },
  { timestamps: true }
);

export const ActivityLog = model<IActivityLog>('ActivityLog', ActivityLogSchema);