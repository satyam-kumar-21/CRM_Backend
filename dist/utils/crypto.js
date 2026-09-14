"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.decryptSecret = exports.encryptSecret = void 0;
const node_crypto_1 = __importDefault(require("node:crypto"));
const ALGORITHM = 'aes-256-gcm';
const key = node_crypto_1.default.createHash('sha256').update(process.env.AI_ENCRYPTION_KEY || 'ai-crm-local-default-key-change-me').digest();
const encryptSecret = (value) => {
    if (!value)
        return '';
    const iv = node_crypto_1.default.randomBytes(16);
    const cipher = node_crypto_1.default.createCipheriv(ALGORITHM, key, iv);
    const encrypted = Buffer.concat([cipher.update(value, 'utf8'), cipher.final()]);
    const authTag = cipher.getAuthTag();
    return Buffer.concat([iv, authTag, encrypted]).toString('base64');
};
exports.encryptSecret = encryptSecret;
const decryptSecret = (value) => {
    if (!value)
        return '';
    const buffer = Buffer.from(value, 'base64');
    const iv = buffer.subarray(0, 16);
    const authTag = buffer.subarray(16, 32);
    const encrypted = buffer.subarray(32);
    const decipher = node_crypto_1.default.createDecipheriv(ALGORITHM, key, iv);
    decipher.setAuthTag(authTag);
    return Buffer.concat([decipher.update(encrypted), decipher.final()]).toString('utf8');
};
exports.decryptSecret = decryptSecret;
