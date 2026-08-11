import { Schema, model, Document, Types } from 'mongoose';
import { tenantPlugin } from '../plugins/tenantPlugin';

export type RemoteSupportStatus = 'PENDING' | 'IN_PROGRESS' | 'SUCCESSFUL' | 'FAILED';

export interface IRemoteSupport extends Document {
  companyId: Types.ObjectId;
  leadId?: Types.ObjectId;
  customerName: string;
  customerContact: string;
  salesEmployeeId: Types.ObjectId;
  salesEmployeeName: string;
  techSupportEmployeeId?: Types.ObjectId;
  techSupportEmployeeName?: string;
  dateTime: Date;
  issueReason: string;
  status: RemoteSupportStatus;
  failedReason?: string;
  failedBy?: Types.ObjectId;
  failedByName?: string;
  failedAt?: Date;
}

const RemoteSupportSchema = new Schema<IRemoteSupport>(
  {
    leadId: { type: Schema.Types.ObjectId, ref: 'Lead', required: false },
    customerName: { type: String, required: true, trim: true },
    customerContact: { type: String, required: true, trim: true },
    salesEmployeeId: { type: Schema.Types.ObjectId, ref: 'Employee', required: true },
    salesEmployeeName: { type: String, required: true, trim: true },
    techSupportEmployeeId: { type: Schema.Types.ObjectId, ref: 'Employee', required: false },
    techSupportEmployeeName: { type: String, trim: true, default: '' },
    dateTime: { type: Date, required: true },
    issueReason: { type: String, required: true, trim: true },
    status: { type: String, enum: ['PENDING', 'IN_PROGRESS', 'SUCCESSFUL', 'FAILED'], default: 'PENDING' },
    failedReason: { type: String, default: '' },
    failedBy: { type: Schema.Types.ObjectId, ref: 'Employee', required: false },
    failedByName: { type: String, trim: true, default: '' },
    failedAt: { type: Date, default: null },
  },
  { timestamps: true }
);

RemoteSupportSchema.plugin(tenantPlugin);
RemoteSupportSchema.index({ companyId: 1, dateTime: -1 });

export const RemoteSupport = model<IRemoteSupport>('RemoteSupport', RemoteSupportSchema);