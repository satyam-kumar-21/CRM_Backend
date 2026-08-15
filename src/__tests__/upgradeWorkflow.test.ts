import assert from 'node:assert/strict';
import { CompanySalesService } from '../services/companySalesService';

assert.strictEqual(typeof CompanySalesService.createUpgrade, 'function');

const totals = CompanySalesService.calculateSalesTotals([
  { customerType: 'NEW', amount: 10000, finalAmount: 10000, transactionType: 'SALE' },
  { customerType: 'UPGRADE', amount: 5000, finalAmount: 5000, transactionType: 'UPGRADE' },
]);

assert.strictEqual(totals.transactionCount, 2);
assert.strictEqual(totals.revenue, 15000);

const filters = CompanySalesService.buildCustomerSearchFilters('Fjkf');
assert.deepStrictEqual(filters.some((item) => ('_id' in item && item._id instanceof RegExp)), false);
assert.deepStrictEqual(filters.some((item) => item.name instanceof RegExp), true);
console.log('upgrade service contract ok');
