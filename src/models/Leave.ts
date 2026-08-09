import { Schema, model, Document } from 'mongoose';
import { LeaveStatus } from '../constants/index';
import { tenantPlugin } from '../plugins/tenantPlugin';

export interface ILeave extends Document {
  companyId: Schema.Types.ObjectId;
  employeeId: Schema.Types.ObjectId;
  leaveType: 'CASUAL' | 'SICK' | 'MATERNITY' | 'ANNUAL';
  startDate: Date;
  endDate: Date;
  reason: string;
  status: LeaveStatus;
  approvedBy?: Schema.Types.ObjectId;
}

const LeaveSchema = new Schema<ILeave>(
  {
    employeeId: { type: Schema.Types.ObjectId, ref: 'Employee', required: true },
    leaveType: { type: String, enum: ['CASUAL', 'SICK', 'MATERNITY', 'ANNUAL'], required: true },
    startDate: { type: Date, required: true },
    endDate: { type: Date, required: true },
    reason: { type: String, required: true },
    status: { type: String, enum: Object.values(LeaveStatus), default: LeaveStatus.PENDING },
    approvedBy: { type: Schema.Types.ObjectId, ref: 'Employee' },
  },
  { timestamps: true }
);

LeaveSchema.plugin(tenantPlugin);
export const Leave = model<ILeave>('Leave', LeaveSchema);