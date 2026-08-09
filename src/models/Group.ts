import { Schema, model, Document } from 'mongoose';
import { tenantPlugin } from '../plugins/tenantPlugin';

export interface IGroup extends Document {
  companyId: Schema.Types.ObjectId;
  name: string;
  description: string;
  privacy: 'public' | 'private';
  members: Schema.Types.ObjectId[];
  createdBy: Schema.Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
}

const GroupSchema = new Schema<IGroup>(
  {
    name: { type: String, required: true, trim: true },
    description: { type: String, default: '' },
    privacy: { type: String, enum: ['public', 'private'], default: 'public' },
    members: [{ type: Schema.Types.ObjectId, ref: 'Employee' }],
    createdBy: { type: Schema.Types.ObjectId, ref: 'Employee', required: true },
  },
  { timestamps: true }
);

GroupSchema.plugin(tenantPlugin);

export const Group = model<IGroup>('Group', GroupSchema);
