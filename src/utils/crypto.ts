import crypto from 'node:crypto';

const ALGORITHM = 'aes-256-gcm';
const key = crypto.createHash('sha256').update(process.env.AI_ENCRYPTION_KEY || 'ai-crm-local-default-key-change-me').digest();

export const encryptSecret = (value?: string): string => {
  if (!value) return '';
  const iv = crypto.randomBytes(16);
  const cipher = crypto.createCipheriv(ALGORITHM, key, iv);
  const encrypted = Buffer.concat([cipher.update(value, 'utf8'), cipher.final()]);
  const authTag = cipher.getAuthTag();
  return Buffer.concat([iv, authTag, encrypted]).toString('base64');
};

export const decryptSecret = (value?: string): string => {
  if (!value) return '';
  const buffer = Buffer.from(value, 'base64');
  const iv = buffer.subarray(0, 16);
  const authTag = buffer.subarray(16, 32);
  const encrypted = buffer.subarray(32);
  const decipher = crypto.createDecipheriv(ALGORITHM, key, iv);
  decipher.setAuthTag(authTag);
  return Buffer.concat([decipher.update(encrypted), decipher.final()]).toString('utf8');
};
