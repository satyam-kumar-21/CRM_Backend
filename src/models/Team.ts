import { Schema, model, Document } from 'mongoose';
import { tenantPlugin } from '../plugins/tenantPlugin';

export interface ITeam extends Document {
  companyId: Schema.Types.ObjectId;
  name: string;
  leaderId?: Schema.Types.ObjectId;
  members: Schema.Types.ObjectId[];
}

const TeamSchema = new Schema<ITeam>(
  {
    name: { type: String, required: true, trim: true },
    leaderId: { type: Schema.Types.ObjectId, ref: 'Employee' },
    members: [{ type: Schema.Types.ObjectId, ref: 'Employee' }],
  },
  { timestamps: true }
);

TeamSchema.plugin(tenantPlugin);
export const Team = model<ITeam>('Team', TeamSchema);