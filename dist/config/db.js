"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.connectDB = void 0;
const mongoose_1 = __importDefault(require("mongoose"));
const Sale_1 = require("../models/Sale");
const connectDB = async () => {
    try {
        const conn = await mongoose_1.default.connect(process.env.MONGO_URI || '');
        const saleIndexes = await Sale_1.Sale.collection.indexes();
        const leadIndex = saleIndexes.find((index) => index.name === 'companyId_1_leadId_1');
        const hasCorrectLeadIndex = leadIndex?.unique === true && Boolean(leadIndex.partialFilterExpression);
        if (!hasCorrectLeadIndex) {
            if (leadIndex)
                await Sale_1.Sale.collection.dropIndex('companyId_1_leadId_1');
            await Sale_1.Sale.collection.createIndex({ companyId: 1, leadId: 1 }, { name: 'companyId_1_leadId_1', unique: true, partialFilterExpression: { leadId: { $type: 'objectId' } } });
            console.log('[Database] Repaired Sale lead uniqueness index');
        }
        console.log(`[Database] MongoDB Connected: ${conn.connection.host}`);
    }
    catch (error) {
        console.error(`[Database Error] ${error}`);
        process.exit(1);
    }
};
exports.connectDB = connectDB;
