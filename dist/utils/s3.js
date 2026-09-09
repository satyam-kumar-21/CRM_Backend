"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.downloadChatAttachment = exports.getChatAttachmentUrl = exports.uploadChatAttachment = void 0;
const node_fs_1 = __importDefault(require("node:fs"));
const node_path_1 = __importDefault(require("node:path"));
const node_crypto_1 = require("node:crypto");
const uploadRoot = node_path_1.default.resolve(process.cwd(), 'uploads');
const defaultMimeType = 'application/octet-stream';
const mimeByExtension = {
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
const ensureUploadDirectory = (targetPath) => {
    node_fs_1.default.mkdirSync(targetPath, { recursive: true });
};
const uploadChatAttachment = async (companyId, conversationId, category, fileBuffer, fileName, contentType) => {
    const extensionMatch = fileName.match(/\.[^\.]+$/);
    const extension = extensionMatch ? extensionMatch[0].toLowerCase() : '';
    const objectKey = `chat/${companyId}/${conversationId}/${category}/${(0, node_crypto_1.randomUUID)()}${extension}`;
    const fullPath = node_path_1.default.join(uploadRoot, objectKey.replace(/\//g, node_path_1.default.sep));
    ensureUploadDirectory(node_path_1.default.dirname(fullPath));
    node_fs_1.default.writeFileSync(fullPath, fileBuffer);
    return { objectKey, bucketName: uploadRoot, contentType: contentType || mimeByExtension[extension] || defaultMimeType, fileSize: fileBuffer.length };
};
exports.uploadChatAttachment = uploadChatAttachment;
const getChatAttachmentUrl = async (objectKey, req) => {
    const host = req?.get ? req.get('host') : undefined;
    const protocol = req?.protocol || process.env.APP_PROTOCOL || 'http';
    const baseUrl = process.env.APP_URL || (host ? `${protocol}://${host}` : 'http://localhost:5000');
    return `${baseUrl.replace(/\/$/, '')}/uploads/${objectKey.replace(/\\/g, '/').replace(/^\/+/, '')}`;
};
exports.getChatAttachmentUrl = getChatAttachmentUrl;
const downloadChatAttachment = async (objectKey) => {
    const safeObjectKey = objectKey.replace(/\\/g, '/');
    const fullPath = node_path_1.default.join(uploadRoot, safeObjectKey.replace(/^\/+/, ''));
    if (!node_fs_1.default.existsSync(fullPath) || !node_fs_1.default.statSync(fullPath).isFile()) {
        throw new Error('Attachment not found.');
    }
    const fileBuffer = node_fs_1.default.readFileSync(fullPath);
    const extension = node_path_1.default.extname(fullPath).toLowerCase();
    return {
        Body: fileBuffer,
        ContentType: mimeByExtension[extension] || defaultMimeType,
        ContentLength: fileBuffer.length,
    };
};
exports.downloadChatAttachment = downloadChatAttachment;
