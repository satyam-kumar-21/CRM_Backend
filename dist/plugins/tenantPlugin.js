"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.tenantPlugin = tenantPlugin;
const mongoose_1 = require("mongoose");
function tenantPlugin(schema) {
    schema.add({
        companyId: {
            type: mongoose_1.Schema.Types.ObjectId,
            ref: 'Company',
            required: true,
            index: true,
        },
    });
    const autoFilterTenant = function () {
        const options = this.getOptions();
        if (options && options.ignoreTenant)
            return;
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
