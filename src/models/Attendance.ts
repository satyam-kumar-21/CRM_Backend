import { Schema, model, Document } from 'mongoose';
import { AttendanceStatus } from '../constants/index';
import { tenantPlugin } from '../plugins/tenantPlugin';

export interface IAttendance extends Document {
  companyId: Schema.Types.ObjectId;
  employeeId: Schema.Types.ObjectId;
  date: Date;
  checkIn?: Date;
  checkOut?: Date;
  status: AttendanceStatus;
  workHours: number;
}

const AttendanceSchema = new Schema<IAttendance>(
  {
    employeeId: { type: Schema.Types.ObjectId, ref: 'Employee', required: true },
    date: { type: Date, required: true },
    checkIn: { type: Date },
    checkOut: { type: Date },
    status: { type: String, enum: Object.values(AttendanceStatus), default: AttendanceStatus.ABSENT },
    workHours: { type: Number, default: 0 },
  },
  { timestamps: true }
);

AttendanceSchema.plugin(tenantPlugin);
export const Attendance = model<IAttendance>('Attendance', AttendanceSchema);