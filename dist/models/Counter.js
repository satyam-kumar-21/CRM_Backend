"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.Counter = void 0;
exports.getNextCustomerId = getNextCustomerId;
const mongoose_1 = require("mongoose");
const CounterSchema = new mongoose_1.Schema({
    companyId: { type: mongoose_1.Schema.Types.ObjectId, required: true, ref: 'Company' },
    key: { type: String, required: true },
    seq: { type: Number, default: 0 },
}, { timestamps: true });
CounterSchema.index({ companyId: 1, key: 1 }, { unique: true });
exports.Counter = (0, mongoose_1.model)('Counter', CounterSchema);
async function getNextCustomerId(companyId) {
    const compId = typeof companyId === 'string' ? new mongoose_1.Types.ObjectId(companyId) : companyId;
    const counter = await exports.Counter.findOneAndUpdate({ companyId: compId, key: 'customer' }, { $inc: { seq: 1 } }, { new: true, upsert: true, setDefaultsOnInsert: true });
    return String(counter.seq).padStart(6, '0');
}
