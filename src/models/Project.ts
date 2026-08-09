import { Schema, model, Document } from 'mongoose';
import { tenantPlugin } from '../plugins/tenantPlugin';

export interface IProject extends Document {
  companyId: Schema.Types.ObjectId;
  name: string;
  description: string;
  status: 'PLANNING' | 'IN_PROGRESS' | 'COMPLETED' | 'ON_HOLD';
  assignedEmployees: Schema.Types.ObjectId[];
  startDate: Date;
  endDate: Date;
}

const ProjectSchema = new Schema<IProject>(
  {
    name: { type: String, required: true, trim: true },
    description: { type: String, required: true },
    status: { type: String, enum: ['PLANNING', 'IN_PROGRESS', 'COMPLETED', 'ON_HOLD'], default: 'PLANNING' },
    assignedEmployees: [{ type: Schema.Types.ObjectId, ref: 'Employee' }],
    startDate: { type: Date, required: true },
    endDate: { type: Date, required: true },
  },
  { timestamps: true }
);

ProjectSchema.plugin(tenantPlugin);
export const Project = model<IProject>('Project', ProjectSchema);