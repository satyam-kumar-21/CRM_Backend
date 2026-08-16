"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const strict_1 = __importDefault(require("node:assert/strict"));
const companySalesService_1 = require("../services/companySalesService");
strict_1.default.strictEqual(typeof companySalesService_1.CompanySalesService.createUpgrade, 'function');
const totals = companySalesService_1.CompanySalesService.calculateSalesTotals([
    { customerType: 'NEW', amount: 10000, finalAmount: 10000, transactionType: 'SALE' },
    { customerType: 'UPGRADE', amount: 5000, finalAmount: 5000, transactionType: 'UPGRADE' },
]);
strict_1.default.strictEqual(totals.transactionCount, 2);
strict_1.default.strictEqual(totals.revenue, 15000);
const filters = companySalesService_1.CompanySalesService.buildCustomerSearchFilters('Fjkf');
strict_1.default.deepStrictEqual(filters.some((item) => ('_id' in item && item._id instanceof RegExp)), false);
strict_1.default.deepStrictEqual(filters.some((item) => item.name instanceof RegExp), true);
console.log('upgrade service contract ok');
