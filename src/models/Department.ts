import { Schema, model, Document } from 'mongoose';
import { tenantPlugin } from '../plugins/tenantPlugin';

export interface IDepartment extends Document {
  companyId: Schema.Types.ObjectId;
  name: string;
  description?: string;
  headEmployeeId?: Schema.Types.ObjectId;
}

const DepartmentSchema = new Schema<IDepartment>(
  {
    name: { type: String, required: true, trim: true },
    description: { type: String, default: '' },
    headEmployeeId: { type: Schema.Types.ObjectId, ref: 'Employee' },
  },
  { timestamps: true }
);

DepartmentSchema.plugin(tenantPlugin);
export const Department = model<IDepartment>('Department', DepartmentSchema);