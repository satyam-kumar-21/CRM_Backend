import { Request, Response, NextFunction } from 'express';
import { validationResult } from 'express-validator';
import { AuthenticatedRequest } from '../middlewares/authMiddleware';
import { ApiResponse } from '../utils/responseHandler';
import { AiAutomationService } from '../services/aiAutomationService';

export class AiAutomationController {
  static async getSettings(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const settings = await AiAutomationService.getSettings(req.user!.companyId!);
      ApiResponse.success(res, 'AI settings fetched successfully', settings);
    } catch (error) {
      next(error);
    }
  }

  static async updateSettings(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        res.status(400).json({ success: false, errors: errors.array() });
        return;
      }

      const settings = await AiAutomationService.updateSettings(req.user!.companyId!, req.body || {});
      ApiResponse.success(res, 'AI settings updated successfully', settings);
    } catch (error) {
      next(error);
    }
  }

  static async listConnections(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const connections = await AiAutomationService.listConnections(req.user!.companyId!);
      ApiResponse.success(res, 'AI connections fetched successfully', connections);
    } catch (error) {
      next(error);
    }
  }

  static async createConnection(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        res.status(400).json({ success: false, errors: errors.array() });
        return;
      }

      const connection = await AiAutomationService.createConnection(req.user!.companyId!, req.body || {});
      ApiResponse.success(res, 'Connection created successfully', connection, 201);
    } catch (error) {
      next(error);
    }
  }

  static async updateConnection(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const connection = await AiAutomationService.updateConnection(req.user!.companyId!, req.params.id, req.body || {});
      ApiResponse.success(res, 'Connection updated successfully', connection);
    } catch (error) {
      next(error);
    }
  }

  static async validateConnection(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const result = await AiAutomationService.validateConnection(req.user!.companyId!, req.params.id);
      ApiResponse.success(res, 'Connection validation completed', result);
    } catch (error) {
      next(error);
    }
  }

  static async listKnowledgeBases(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const knowledgeBases = await AiAutomationService.listKnowledgeBases(req.user!.companyId!);
      ApiResponse.success(res, 'Knowledge bases fetched successfully', knowledgeBases);
    } catch (error) {
      next(error);
    }
  }

  static async createKnowledgeBase(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const knowledgeBase = await AiAutomationService.createKnowledgeBase(req.user!.companyId!, req.body || {});
      ApiResponse.success(res, 'Knowledge base created successfully', knowledgeBase, 201);
    } catch (error) {
      next(error);
    }
  }

  static async uploadKnowledgeFile(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const file = req.file;
      if (!file) {
        res.status(400).json({ success: false, message: 'File is required.' });
        return;
      }

      const result = await AiAutomationService.uploadKnowledgeFile(req.user!.companyId!, req.params.id, {
        buffer: file.buffer,
        originalname: file.originalname,
        mimetype: file.mimetype,
      });

      ApiResponse.success(res, 'Knowledge file uploaded successfully', result, 201);
    } catch (error) {
      next(error);
    }
  }

  static async listConversations(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const conversations = await AiAutomationService.listConversations(req.user!.companyId!);
      ApiResponse.success(res, 'Conversations fetched successfully', conversations);
    } catch (error) {
      next(error);
    }
  }

  static async getConversation(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const conversation = await AiAutomationService.getConversation(req.user!.companyId!, req.params.id);
      ApiResponse.success(res, 'Conversation fetched successfully', conversation);
    } catch (error) {
      next(error);
    }
  }

  static async getDashboard(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const dashboard = await AiAutomationService.getDashboard(req.user!.companyId!);
      ApiResponse.success(res, 'AI dashboard fetched successfully', dashboard);
    } catch (error) {
      next(error);
    }
  }

  static async askDbQuestion(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const question = (req.body?.question || '').trim();
      if (!question) {
        return res.status(400).json({ success: false, message: 'A question is required.' });
      }

      const result = await AiAutomationService.askCompanyData(req.user!.companyId!, question);
      ApiResponse.success(res, 'AI answer generated successfully', result);
    } catch (error) {
      next(error);
    }
  }

  static async processWebhook(req: Request, res: Response, next: NextFunction) {
    try {
      const payload = req.body || {};
      const signature = req.headers['x-jivo-signature'] as string | undefined;
      const valid = await AiAutomationService.verifyWebhookSignature(payload, signature, process.env.JIVO_WEBHOOK_SECRET || '');

      if (!valid) {
        return res.status(401).json({ success: false, message: 'Invalid webhook signature.' });
      }

      const companyId = req.headers['x-company-id'] as string | undefined || (payload.companyId as string | undefined) || process.env.DEFAULT_COMPANY_ID || '';
      if (!companyId) {
        return res.status(400).json({ success: false, message: 'Company ID is required for webhook processing.' });
      }

      const result = await AiAutomationService.processIncomingJivoEvent(companyId, payload);
      ApiResponse.success(res, 'Webhook processed successfully', result);
    } catch (error) {
      next(error);
    }
  }

  static async processMockJivo(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const payload = req.body || {};
      const companyId = req.user!.companyId!;
      const result = await AiAutomationService.processIncomingJivoEvent(companyId, payload);
      ApiResponse.success(res, 'Mock Jivo event processed successfully', result, 200);
    } catch (error) {
      next(error);
    }
  }
}
