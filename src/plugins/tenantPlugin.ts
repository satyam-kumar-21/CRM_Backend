import { Schema, Document } from 'mongoose';

export interface ITenantDocument extends Document {
  companyId: Schema.Types.ObjectId;
}

export function tenantPlugin(schema: Schema) {
  schema.add({
    companyId: {
      type: Schema.Types.ObjectId,
      ref: 'Company',
      required: true,
      index: true,
    },
  });

  const autoFilterTenant = function (this: any) {
    const options = this.getOptions();
    if (options && options.ignoreTenant) return;

    const tenantId = options.tenantId;
    if (tenantId) {
      this.where({ companyId: tenantId });
    }
  };

  schema.pre('find', autoFilterTenant);
  schema.pre('findOne', autoFilterTenant);
  schema.pre('countDocuments', autoFilterTenant);
  schema.pre('findOneAndUpdate', autoFilterTenant);
  schema.pre('updateMany', autoFilterTenant);
}