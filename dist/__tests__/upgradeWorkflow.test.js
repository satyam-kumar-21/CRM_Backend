"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const strict_1 = __importDefault(require("node:assert/strict"));
const companySalesService_1 = require("../services/companySalesService");
strict_1.default.strictEqual(typeof companySalesService_1.CompanySalesService.createUpgrade, 'function');
console.log('upgrade service contract ok');
