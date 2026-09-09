import fs from 'node:fs';
import path from 'node:path';
import { randomUUID } from 'node:crypto';

const uploadRoot = path.resolve(process.cwd(), 'uploads');

const defaultMimeType = 'application/octet-stream';
const mimeByExtension: Record<string, string> = {
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.png': 'image/png',
  '.webp': 'image/webp',
  '.gif': 'image/gif',
  '.mp3': 'audio/mpeg',
  '.wav': 'audio/wav',
  '.webm': 'audio/webm',
  '.ogg': 'audio/ogg',
  '.mp4': 'audio/mp4',
  '.pdf': 'application/pdf',
  '.doc': 'application/msword',
  '.docx': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  '.xls': 'application/vnd.ms-excel',
  '.xlsx': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  '.csv': 'text/csv',
  '.txt': 'text/plain',
  '.zip': 'application/zip',
};

const ensureUploadDirectory = (targetPath: string) => {
  fs.mkdirSync(targetPath, { recursive: true });
};

export const uploadChatAttachment = async (companyId: string, conversationId: string, category: 'images' | 'files' | 'audio', fileBuffer: Buffer, fileName: string, contentType: string) => {
  const extensionMatch = fileName.match(/\.[^\.]+$/);
  const extension = extensionMatch ? extensionMatch[0].toLowerCase() : '';
  const objectKey = `chat/${companyId}/${conversationId}/${category}/${randomUUID()}${extension}`;
  const fullPath = path.join(uploadRoot, objectKey.replace(/\//g, path.sep));

  ensureUploadDirectory(path.dirname(fullPath));
  fs.writeFileSync(fullPath, fileBuffer);

  return { objectKey, bucketName: uploadRoot, contentType: contentType || mimeByExtension[extension] || defaultMimeType, fileSize: fileBuffer.length };
};

export const getChatAttachmentUrl = async (objectKey: string, req?: { protocol?: string; get?: (header: string) => string | undefined }) => {
  const host = req?.get ? req.get('host') : undefined;
  const protocol = req?.protocol || process.env.APP_PROTOCOL || 'http';
  const baseUrl = process.env.APP_URL || (host ? `${protocol}://${host}` : 'http://localhost:5000');
  return `${baseUrl.replace(/\/$/, '')}/uploads/${objectKey.replace(/\\/g, '/').replace(/^\/+/, '')}`;
};

export const downloadChatAttachment = async (objectKey: string) => {
  const safeObjectKey = objectKey.replace(/\\/g, '/');
  const fullPath = path.join(uploadRoot, safeObjectKey.replace(/^\/+/, ''));

  if (!fs.existsSync(fullPath) || !fs.statSync(fullPath).isFile()) {
    throw new Error('Attachment not found.');
  }

  const fileBuffer = fs.readFileSync(fullPath);
  const extension = path.extname(fullPath).toLowerCase();

  return {
    Body: fileBuffer,
    ContentType: mimeByExtension[extension] || defaultMimeType,
    ContentLength: fileBuffer.length,
  };
};
