import { Schema, model, Document, Types } from 'mongoose';
import { tenantPlugin } from '../plugins/tenantPlugin';

export type RemoteSupportStatus = 'PENDING' | 'IN_PROGRESS' | 'SUCCESSFUL' | 'FAILED' | 'REJECTED';

export interface IRemoteSupport extends Document {
  companyId: Types.ObjectId;
  leadId?: Types.ObjectId;
  workflowMessageId?: string;
  customerName: string;
  customerContact: string;
  country?: string;
  system?: string;
  otherDetails?: string;
  salesEmployeeId: Types.ObjectId;
  salesEmployeeName: string;
  techSupportEmployeeId?: Types.ObjectId;
  techSupportEmployeeName?: string;
  dateTime: Date;
  issueReason: string;
  status: RemoteSupportStatus;
  acceptedAt?: Date;
  completedAt?: Date;
  failedReason?: string;
  failedBy?: Types.ObjectId;
  failedByName?: string;
  failedAt?: Date;
  rejectedReason?: string;
  rejectedBy?: Types.ObjectId;
  rejectedByName?: string;
  rejectedAt?: Date;
}

const RemoteSupportSchema = new Schema<IRemoteSupport>(
  {
    leadId: { type: Schema.Types.ObjectId, ref: 'Lead', required: false },
    workflowMessageId: { type: String, trim: true, default: '' },
    customerName: { type: String, required: true, trim: true },
    customerContact: { type: String, required: true, trim: true },
    country: { type: String, trim: true, default: '' },
    system: { type: String, trim: true, default: '' },
    otherDetails: { type: String, trim: true, default: '' },
    salesEmployeeId: { type: Schema.Types.ObjectId, ref: 'Employee', required: true },
    salesEmployeeName: { type: String, required: true, trim: true },
    techSupportEmployeeId: { type: Schema.Types.ObjectId, ref: 'Employee', required: false },
    techSupportEmployeeName: { type: String, trim: true, default: '' },
    dateTime: { type: Date, required: true },
    issueReason: { type: String, required: true, trim: true },
    status: { type: String, enum: ['PENDING', 'IN_PROGRESS', 'SUCCESSFUL', 'FAILED', 'REJECTED'], default: 'PENDING' },
    acceptedAt: { type: Date, default: null },
    completedAt: { type: Date, default: null },
    failedReason: { type: String, default: '' },
    failedBy: { type: Schema.Types.ObjectId, ref: 'Employee', required: false },
    failedByName: { type: String, trim: true, default: '' },
    failedAt: { type: Date, default: null },
    rejectedReason: { type: String, default: '' },
    rejectedBy: { type: Schema.Types.ObjectId, ref: 'Employee', required: false },
    rejectedByName: { type: String, trim: true, default: '' },
    rejectedAt: { type: Date, default: null },
  },
  { timestamps: true }
);

RemoteSupportSchema.plugin(tenantPlugin);
RemoteSupportSchema.index({ companyId: 1, dateTime: -1 });

export const RemoteSupport = model<IRemoteSupport>('RemoteSupport', RemoteSupportSchema);