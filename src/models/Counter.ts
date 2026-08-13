import { Schema, model, Document, Types } from 'mongoose';

export interface ICounter extends Document {
  companyId: Types.ObjectId;
  key: string;
  seq: number;
}

const CounterSchema = new Schema<ICounter>(
  {
    companyId: { type: Schema.Types.ObjectId, required: true, ref: 'Company' },
    key: { type: String, required: true },
    seq: { type: Number, default: 0 },
  },
  { timestamps: true }
);

CounterSchema.index({ companyId: 1, key: 1 }, { unique: true });

export const Counter = model<ICounter>('Counter', CounterSchema);

export async function getNextCustomerId(companyId: string | Types.ObjectId): Promise<string> {
  const compId = typeof companyId === 'string' ? new Types.ObjectId(companyId) : companyId;
  const counter = await Counter.findOneAndUpdate(
    { companyId: compId, key: 'customer' },
    { $inc: { seq: 1 } },
    { new: true, upsert: true, setDefaultsOnInsert: true }
  );
  return String(counter.seq).padStart(6, '0');
}
