import { Schema, model, Document } from 'mongoose';
import { tenantPlugin } from '../plugins/tenantPlugin';

export interface IDocumentRecord extends Document {
  companyId: Schema.Types.ObjectId;
  uploadedBy: Schema.Types.ObjectId;
  title: string;
  fileUrl: string;
  fileType: string;
  fileSizeMB: number;
}

const DocumentSchema = new Schema<IDocumentRecord>(
  {
    uploadedBy: { type: Schema.Types.ObjectId, ref: 'Employee', required: true },
    title: { type: String, required: true, trim: true },
    fileUrl: { type: String, required: true },
    fileType: { type: String, required: true },
    fileSizeMB: { type: Number, required: true },
  },
  { timestamps: true }
);

DocumentSchema.plugin(tenantPlugin);
export const DocumentModel = model<IDocumentRecord>('Document', DocumentSchema);