import assert from 'node:assert/strict';
import { CompanySalesService } from '../services/companySalesService';

assert.strictEqual(typeof CompanySalesService.createUpgrade, 'function');
console.log('upgrade service contract ok');
