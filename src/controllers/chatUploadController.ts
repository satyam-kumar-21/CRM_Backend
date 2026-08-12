import { Request, Response, NextFunction } from 'express';
import multer from 'multer';
import { validationResult } from 'express-validator';
import { AuthenticatedRequest } from '../middlewares/authMiddleware';
import { CompanyAuthService } from '../services/companyAuthService';
import { ApiResponse } from '../utils/responseHandler';
import { uploadChatAttachment, getChatAttachmentUrl, downloadChatAttachment } from '../utils/s3';
import { emitUserEvent } from '../realtime/socket';
import { MessageType, Message } from '../models/Message';

const upload = multer({ storage: multer.memoryStorage() });

const authorizedFileTypes = {
  IMAGE: ['image/jpeg', 'image/jpg', 'image/png', 'image/webp', 'image/gif'],
  FILE: [
    'application/pdf',
    'application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'application/vnd.ms-excel',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    'text/csv',
    'text/plain',
    'application/zip',
    'application/x-zip-compressed',
    'application/octet-stream',
  ],
  AUDIO: ['audio/webm', 'audio/ogg', 'audio/mp4', 'audio/mpeg', 'audio/wav'],
};

const uploadLimits = {
  files: Number(process.env.MAX_CHAT_FILE_SIZE_MB || 20) * 1024 * 1024,
  audio: Number(process.env.MAX_CHAT_AUDIO_SIZE_MB || 10) * 1024 * 1024,
};

const determineMessageType = (mimeType: string) => {
  if (authorizedFileTypes.IMAGE.includes(mimeType)) return 'IMAGE';
  if (authorizedFileTypes.AUDIO.includes(mimeType)) return 'AUDIO';
  return 'FILE';
};

interface AuthenticatedUploadRequest extends AuthenticatedRequest {
  file?: Express.Multer.File;
}

export const chatUpload = [
  upload.single('attachment'),
  async (req: AuthenticatedUploadRequest, res: Response, next: NextFunction) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        res.status(400).json({ success: false, errors: errors.array() });
        return;
      }

      if (!req.user) {
        res.status(401).json({ success: false, message: 'Authentication required.' });
        return;
      }
      const userId = req.user.id;

      const conversationId = req.params.conversationId;
      if (!req.file) {
        res.status(400).json({ success: false, message: 'Attachment is required.' });
        return;
      }

      const allowed = await CompanyAuthService.canAccessConversation(req.user.companyId!, req.user.id, req.user.role, conversationId);
      if (!allowed) {
        res.status(403).json({ success: false, message: 'Not authorized to send in this conversation.' });
        return;
      }

      const { originalname, mimetype, buffer, size } = req.file;
      const messageType = determineMessageType(mimetype);

      if (messageType === 'IMAGE' && !authorizedFileTypes.IMAGE.includes(mimetype)) {
        res.status(400).json({ success: false, message: 'Unsupported image type.' });
        return;
      }
      if (messageType === 'AUDIO' && !authorizedFileTypes.AUDIO.includes(mimetype)) {
        res.status(400).json({ success: false, message: 'Unsupported audio type.' });
        return;
      }
      if (messageType === 'FILE' && !authorizedFileTypes.FILE.includes(mimetype) && !mimetype.startsWith('application/')) {
        res.status(400).json({ success: false, message: 'Unsupported file type.' });
        return;
      }

      if (messageType === 'AUDIO' && size > uploadLimits.audio) {
        res.status(413).json({ success: false, message: `Audio exceeds maximum size of ${process.env.MAX_CHAT_AUDIO_SIZE_MB || 10} MB.` });
        return;
      }

      if (messageType !== 'AUDIO' && size > uploadLimits.files) {
        res.status(413).json({ success: false, message: `File exceeds maximum size of ${process.env.MAX_CHAT_FILE_SIZE_MB || 20} MB.` });
        return;
      }

      const category = messageType === 'IMAGE' ? 'images' : messageType === 'AUDIO' ? 'audio' : 'files';
      const uploadResult = await uploadChatAttachment(req.user.companyId!, conversationId, category, buffer, originalname, mimetype);
      const message = await CompanyAuthService.postConversationMessage(
        req.user.companyId!,
        userId,
        req.user.role,
        conversationId,
        originalname,
        {
          messageType,
          fileName: originalname,
          mimeType: mimetype,
          objectKey: uploadResult.objectKey,
          fileSize: uploadResult.fileSize,
          duration: req.body.duration ? Number(req.body.duration) : undefined,
        }
      );

      const realtimeMessage = await CompanyAuthService.getRealtimeMessage(req.user.companyId!, req.user.id, message._id.toString());
      const audience = await CompanyAuthService.getConversationAudience(req.user.companyId!, conversationId);
      emitUserEvent([userId], 'message:new', { ...realtimeMessage, isMine: true, conversationId });
      emitUserEvent(audience.filter((id) => id !== userId), 'message:new', { ...realtimeMessage, isMine: false, conversationId });

      ApiResponse.success(res, 'Attachment uploaded successfully.', message, 201);
    } catch (error) {
      next(error);
    }
  },
];

export const fetchAttachmentUrl = async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    if (!req.user) {
      res.status(401).json({ success: false, message: 'Authentication required.' });
      return;
    }

    const { conversationId, messageId } = req.params;
    const allowed = await CompanyAuthService.canAccessConversation(req.user.companyId!, req.user.id, req.user.role, conversationId);
    if (!allowed) {
      res.status(403).json({ success: false, message: 'Not authorized to access this conversation.' });
      return;
    }

    const message = await Message.findOne({ _id: messageId, companyId: req.user.companyId! });
    if (!message || !message.objectKey) {
      res.status(404).json({ success: false, message: 'Attachment not found.' });
      return;
    }

    const isGroupMessage = message.groupId?.toString() === conversationId;
    const isDirectMessage = !message.groupId &&
      ((message.senderId.toString() === req.user.id || message.recipientId?.toString() === req.user.id) &&
       (message.senderId.toString() === conversationId || message.recipientId?.toString() === conversationId));

    if (!isGroupMessage && !isDirectMessage) {
      res.status(404).json({ success: false, message: 'Attachment not found in this conversation.' });
      return;
    }

    const url = await getChatAttachmentUrl(message.objectKey);
    ApiResponse.success(res, 'Attachment URL fetched.', { url });
  } catch (error) {
    next(error);
  }
};

export const downloadAttachment = async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    if (!req.user) {
      res.status(401).json({ success: false, message: 'Authentication required.' });
      return;
    }

    const { conversationId, messageId } = req.params;
    const allowed = await CompanyAuthService.canAccessConversation(req.user.companyId!, req.user.id, req.user.role, conversationId);
    if (!allowed) {
      res.status(403).json({ success: false, message: 'Not authorized to access this conversation.' });
      return;
    }

    const message = await Message.findOne({ _id: messageId, companyId: req.user.companyId! });
    if (!message || !message.objectKey) {
      res.status(404).json({ success: false, message: 'Attachment not found.' });
      return;
    }

    const isGroupMessage = message.groupId?.toString() === conversationId;
    const isDirectMessage = !message.groupId &&
      ((message.senderId.toString() === req.user.id || message.recipientId?.toString() === req.user.id) &&
       (message.senderId.toString() === conversationId || message.recipientId?.toString() === conversationId));

    if (!isGroupMessage && !isDirectMessage) {
      res.status(404).json({ success: false, message: 'Attachment not found in this conversation.' });
      return;
    }

    const attachment = await downloadChatAttachment(message.objectKey);
    const filename = message.fileName || message.content || 'attachment';
    const disposition = `attachment; filename="${encodeURIComponent(filename)}"`;
    if (attachment.ContentType) res.setHeader('Content-Type', attachment.ContentType);
    res.setHeader('Content-Disposition', disposition);
    if (attachment.ContentLength !== undefined) res.setHeader('Content-Length', attachment.ContentLength.toString());

    const body = attachment.Body as any;
    if (body && typeof body.pipe === 'function') {
      body.pipe(res);
    } else if (body instanceof Uint8Array) {
      res.send(body);
    } else {
      const chunks: Uint8Array[] = [];
      for await (const chunk of body) {
        chunks.push(chunk);
      }
      res.send(Buffer.concat(chunks));
    }
  } catch (error) {
    next(error);
  }
};
