import { randomUUID } from 'crypto';
import { S3Client, PutObjectCommand, GetObjectCommand, GetObjectCommandOutput } from '@aws-sdk/client-s3';
import { getSignedUrl as getAwsSignedUrl } from '@aws-sdk/s3-request-presigner';

const bucketName = process.env.AWS_S3_BUCKET_NAME;
const region = process.env.AWS_REGION;
const accessKeyId = process.env.AWS_ACCESS_KEY_ID;
const secretAccessKey = process.env.AWS_SECRET_ACCESS_KEY;

if (!bucketName || !region || !accessKeyId || !secretAccessKey) {
  throw new Error('AWS S3 configuration is required. Set AWS_ACCESS_KEY_ID, AWS_SECRET_ACCESS_KEY, AWS_REGION, and AWS_S3_BUCKET_NAME in environment.');
}

const s3Client = new S3Client({
  region,
  credentials: {
    accessKeyId,
    secretAccessKey,
  },
});

export const uploadChatAttachment = async (companyId: string, conversationId: string, category: 'images' | 'files' | 'audio', fileBuffer: Buffer, fileName: string, contentType: string) => {
  const extensionMatch = fileName.match(/\.[^\.]+$/);
  const extension = extensionMatch ? extensionMatch[0] : '';
  const objectKey = `chat/${companyId}/${conversationId}/${category}/${randomUUID()}${extension}`;

  await s3Client.send(new PutObjectCommand({
    Bucket: bucketName,
    Key: objectKey,
    Body: fileBuffer,
    ContentType: contentType,
    ACL: 'private',
  }));

  return { objectKey, bucketName, contentType, fileSize: fileBuffer.length };
};

export const getChatAttachmentUrl = async (objectKey: string) => {
  const command = new GetObjectCommand({ Bucket: bucketName, Key: objectKey });
  return getAwsSignedUrl(s3Client, command, { expiresIn: 60 * 60 });
};

export const downloadChatAttachment = async (objectKey: string) => {
  const command = new GetObjectCommand({ Bucket: bucketName, Key: objectKey });
  const response = await s3Client.send(command);
  return response as GetObjectCommandOutput;
};
