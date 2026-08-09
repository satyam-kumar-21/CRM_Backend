import { Schema, model, Document } from 'mongoose';
import { TaskStatus, Priority } from '../constants/index';
import { tenantPlugin } from '../plugins/tenantPlugin';

export interface ITask extends Document {
  companyId: Schema.Types.ObjectId;
  projectId: Schema.Types.ObjectId;
  title: string;
  description: string;
  status: TaskStatus;
  priority: Priority;
  assignedTo: Schema.Types.ObjectId;
  assignedBy: Schema.Types.ObjectId;
  deadline: Date;
}

const TaskSchema = new Schema<ITask>(
  {
    projectId: { type: Schema.Types.ObjectId, ref: 'Project', required: true },
    title: { type: String, required: true, trim: true },
    description: { type: String, required: true },
    status: { type: String, enum: Object.values(TaskStatus), default: TaskStatus.TODO },
    priority: { type: String, enum: Object.values(Priority), default: Priority.MEDIUM },
    assignedTo: { type: Schema.Types.ObjectId, ref: 'Employee', required: true },
    assignedBy: { type: Schema.Types.ObjectId, ref: 'Employee', required: true },
    deadline: { type: Date, required: true },
  },
  { timestamps: true }
);

TaskSchema.plugin(tenantPlugin);
export const Task = model<ITask>('Task', TaskSchema);