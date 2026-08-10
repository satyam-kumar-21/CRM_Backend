"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.Sale = void 0;
const mongoose_1 = require("mongoose");
const tenantPlugin_1 = require("../plugins/tenantPlugin");
const SaleSchema = new mongoose_1.Schema({
    leadId: { type: mongoose_1.Schema.Types.ObjectId, ref: 'Lead' },
    name: { type: String, required: true, trim: true },
    country: { type: String, required: true, trim: true },
    system: { type: String, required: true, trim: true },
    connectedBy: { type: String, required: true, trim: true },
    amount: { type: Number, required: true, min: 0 },
    paymentMethod: { type: String, enum: ['Card', 'Check', 'Wire Transfer', 'Cash', 'Other'], required: true },
    saleDate: { type: String, required: true },
}, { timestamps: true });
SaleSchema.plugin(tenantPlugin_1.tenantPlugin);
SaleSchema.index({ companyId: 1, leadId: 1 }, { unique: true, sparse: true });
exports.Sale = (0, mongoose_1.model)('Sale', SaleSchema);
