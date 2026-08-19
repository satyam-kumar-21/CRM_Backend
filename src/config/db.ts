import mongoose from 'mongoose';
import { Sale } from '../models/Sale';

export const connectDB = async (): Promise<void> => {
  try {
    const conn = await mongoose.connect(process.env.MONGO_URI || '');
    const saleIndexes = await Sale.collection.indexes();
    const leadIndex = saleIndexes.find((index) => index.name === 'companyId_1_leadId_1');
    const hasCorrectLeadIndex = leadIndex?.unique === true && Boolean(leadIndex.partialFilterExpression);

    if (!hasCorrectLeadIndex) {
      if (leadIndex) await Sale.collection.dropIndex('companyId_1_leadId_1');
      await Sale.collection.createIndex(
        { companyId: 1, leadId: 1 },
        { name: 'companyId_1_leadId_1', unique: true, partialFilterExpression: { leadId: { $type: 'objectId' } } }
      );
      console.log('[Database] Repaired Sale lead uniqueness index');
    }
    console.log(`[Database] MongoDB Connected: ${conn.connection.host}`);
  } catch (error) {
    console.error(`[Database Error] ${error}`);
    process.exit(1);
  }
};