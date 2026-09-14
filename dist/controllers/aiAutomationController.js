"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.AiAutomationController = void 0;
const express_validator_1 = require("express-validator");
const responseHandler_1 = require("../utils/responseHandler");
const aiAutomationService_1 = require("../services/aiAutomationService");
class AiAutomationController {
    static async getSettings(req, res, next) {
        try {
            const settings = await aiAutomationService_1.AiAutomationService.getSettings(req.user.companyId);
            responseHandler_1.ApiResponse.success(res, 'AI settings fetched successfully', settings);
        }
        catch (error) {
            next(error);
        }
    }
    static async updateSettings(req, res, next) {
        try {
            const errors = (0, express_validator_1.validationResult)(req);
            if (!errors.isEmpty()) {
                res.status(400).json({ success: false, errors: errors.array() });
                return;
            }
            const settings = await aiAutomationService_1.AiAutomationService.updateSettings(req.user.companyId, req.body || {});
            responseHandler_1.ApiResponse.success(res, 'AI settings updated successfully', settings);
        }
        catch (error) {
            next(error);
        }
    }
    static async listConnections(req, res, next) {
        try {
            const connections = await aiAutomationService_1.AiAutomationService.listConnections(req.user.companyId);
            responseHandler_1.ApiResponse.success(res, 'AI connections fetched successfully', connections);
        }
        catch (error) {
            next(error);
        }
    }
    static async createConnection(req, res, next) {
        try {
            const errors = (0, express_validator_1.validationResult)(req);
            if (!errors.isEmpty()) {
                res.status(400).json({ success: false, errors: errors.array() });
                return;
            }
            const connection = await aiAutomationService_1.AiAutomationService.createConnection(req.user.companyId, req.body || {});
            responseHandler_1.ApiResponse.success(res, 'Connection created successfully', connection, 201);
        }
        catch (error) {
            next(error);
        }
    }
    static async updateConnection(req, res, next) {
        try {
            const connection = await aiAutomationService_1.AiAutomationService.updateConnection(req.user.companyId, req.params.id, req.body || {});
            responseHandler_1.ApiResponse.success(res, 'Connection updated successfully', connection);
        }
        catch (error) {
            next(error);
        }
    }
    static async validateConnection(req, res, next) {
        try {
            const result = await aiAutomationService_1.AiAutomationService.validateConnection(req.user.companyId, req.params.id);
            responseHandler_1.ApiResponse.success(res, 'Connection validation completed', result);
        }
        catch (error) {
            next(error);
        }
    }
    static async listKnowledgeBases(req, res, next) {
        try {
            const knowledgeBases = await aiAutomationService_1.AiAutomationService.listKnowledgeBases(req.user.companyId);
            responseHandler_1.ApiResponse.success(res, 'Knowledge bases fetched successfully', knowledgeBases);
        }
        catch (error) {
            next(error);
        }
    }
    static async createKnowledgeBase(req, res, next) {
        try {
            const knowledgeBase = await aiAutomationService_1.AiAutomationService.createKnowledgeBase(req.user.companyId, req.body || {});
            responseHandler_1.ApiResponse.success(res, 'Knowledge base created successfully', knowledgeBase, 201);
        }
        catch (error) {
            next(error);
        }
    }
    static async uploadKnowledgeFile(req, res, next) {
        try {
            const file = req.file;
            if (!file) {
                res.status(400).json({ success: false, message: 'File is required.' });
                return;
            }
            const result = await aiAutomationService_1.AiAutomationService.uploadKnowledgeFile(req.user.companyId, req.params.id, {
                buffer: file.buffer,
                originalname: file.originalname,
                mimetype: file.mimetype,
            });
            responseHandler_1.ApiResponse.success(res, 'Knowledge file uploaded successfully', result, 201);
        }
        catch (error) {
            next(error);
        }
    }
    static async listConversations(req, res, next) {
        try {
            const conversations = await aiAutomationService_1.AiAutomationService.listConversations(req.user.companyId);
            responseHandler_1.ApiResponse.success(res, 'Conversations fetched successfully', conversations);
        }
        catch (error) {
            next(error);
        }
    }
    static async getConversation(req, res, next) {
        try {
            const conversation = await aiAutomationService_1.AiAutomationService.getConversation(req.user.companyId, req.params.id);
            responseHandler_1.ApiResponse.success(res, 'Conversation fetched successfully', conversation);
        }
        catch (error) {
            next(error);
        }
    }
    static async getDashboard(req, res, next) {
        try {
            const dashboard = await aiAutomationService_1.AiAutomationService.getDashboard(req.user.companyId);
            responseHandler_1.ApiResponse.success(res, 'AI dashboard fetched successfully', dashboard);
        }
        catch (error) {
            next(error);
        }
    }
    static async askDbQuestion(req, res, next) {
        try {
            const question = (req.body?.question || '').trim();
            if (!question) {
                return res.status(400).json({ success: false, message: 'A question is required.' });
            }
            const result = await aiAutomationService_1.AiAutomationService.askCompanyData(req.user.companyId, question);
            responseHandler_1.ApiResponse.success(res, 'AI answer generated successfully', result);
        }
        catch (error) {
            next(error);
        }
    }
    static async processWebhook(req, res, next) {
        try {
            const payload = req.body || {};
            const signature = req.headers['x-jivo-signature'];
            const valid = await aiAutomationService_1.AiAutomationService.verifyWebhookSignature(payload, signature, process.env.JIVO_WEBHOOK_SECRET || '');
            if (!valid) {
                return res.status(401).json({ success: false, message: 'Invalid webhook signature.' });
            }
            const companyId = req.headers['x-company-id'] || payload.companyId || process.env.DEFAULT_COMPANY_ID || '';
            if (!companyId) {
                return res.status(400).json({ success: false, message: 'Company ID is required for webhook processing.' });
            }
            const result = await aiAutomationService_1.AiAutomationService.processIncomingJivoEvent(companyId, payload);
            responseHandler_1.ApiResponse.success(res, 'Webhook processed successfully', result);
        }
        catch (error) {
            next(error);
        }
    }
    static async processMockJivo(req, res, next) {
        try {
            const payload = req.body || {};
            const companyId = req.user.companyId;
            const result = await aiAutomationService_1.AiAutomationService.processIncomingJivoEvent(companyId, payload);
            responseHandler_1.ApiResponse.success(res, 'Mock Jivo event processed successfully', result, 200);
        }
        catch (error) {
            next(error);
        }
    }
}
exports.AiAutomationController = AiAutomationController;
