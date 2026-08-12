"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.downloadChatAttachment = exports.getChatAttachmentUrl = exports.uploadChatAttachment = void 0;
const crypto_1 = require("crypto");
const client_s3_1 = require("@aws-sdk/client-s3");
const s3_request_presigner_1 = require("@aws-sdk/s3-request-presigner");
const bucketName = process.env.AWS_S3_BUCKET_NAME;
const region = process.env.AWS_REGION;
const accessKeyId = process.env.AWS_ACCESS_KEY_ID;
const secretAccessKey = process.env.AWS_SECRET_ACCESS_KEY;
if (!bucketName || !region || !accessKeyId || !secretAccessKey) {
    throw new Error('AWS S3 configuration is required. Set AWS_ACCESS_KEY_ID, AWS_SECRET_ACCESS_KEY, AWS_REGION, and AWS_S3_BUCKET_NAME in environment.');
}
const s3Client = new client_s3_1.S3Client({
    region,
    credentials: {
        accessKeyId,
        secretAccessKey,
    },
});
const uploadChatAttachment = async (companyId, conversationId, category, fileBuffer, fileName, contentType) => {
    const extensionMatch = fileName.match(/\.[^\.]+$/);
    const extension = extensionMatch ? extensionMatch[0] : '';
    const objectKey = `chat/${companyId}/${conversationId}/${category}/${(0, crypto_1.randomUUID)()}${extension}`;
    await s3Client.send(new client_s3_1.PutObjectCommand({
        Bucket: bucketName,
        Key: objectKey,
        Body: fileBuffer,
        ContentType: contentType,
        ACL: 'private',
    }));
    return { objectKey, bucketName, contentType, fileSize: fileBuffer.length };
};
exports.uploadChatAttachment = uploadChatAttachment;
const getChatAttachmentUrl = async (objectKey) => {
    const command = new client_s3_1.GetObjectCommand({ Bucket: bucketName, Key: objectKey });
    return (0, s3_request_presigner_1.getSignedUrl)(s3Client, command, { expiresIn: 60 * 60 });
};
exports.getChatAttachmentUrl = getChatAttachmentUrl;
const downloadChatAttachment = async (objectKey) => {
    const command = new client_s3_1.GetObjectCommand({ Bucket: bucketName, Key: objectKey });
    const response = await s3Client.send(command);
    return response;
};
exports.downloadChatAttachment = downloadChatAttachment;
