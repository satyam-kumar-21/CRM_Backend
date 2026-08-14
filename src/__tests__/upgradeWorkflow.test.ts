import assert from 'node:assert/strict';
import { CompanySalesService } from '../services/companySalesService';

assert.strictEqual(typeof CompanySalesService.createUpgrade, 'function');

const filters = CompanySalesService.buildCustomerSearchFilters('Fjkf');
assert.deepStrictEqual(filters.some((item) => ('_id' in item && item._id instanceof RegExp)), false);
assert.deepStrictEqual(filters.some((item) => item.name instanceof RegExp), true);
console.log('upgrade service contract ok');
