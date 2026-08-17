"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.CompanyAuthController = void 0;
const express_validator_1 = require("express-validator");
const companyAuthService_1 = require("../services/companyAuthService");
const responseHandler_1 = require("../utils/responseHandler");
const socket_1 = require("../realtime/socket");
class CompanyAuthController {
    static async login(req, res, next) {
        try {
            const errors = (0, express_validator_1.validationResult)(req);
            if (!errors.isEmpty()) {
                res.status(400).json({ success: false, errors: errors.array() });
                return;
            }
            const { employeeId, email, password } = req.body;
            const identifier = email || employeeId;
            const result = await companyAuthService_1.CompanyAuthService.login(identifier, password);
            if (result.otpRequired) {
                responseHandler_1.ApiResponse.success(res, 'OTP sent to your email', {
                    otpRequired: true,
                    otpToken: result.otpToken,
                    maskedEmail: result.maskedEmail,
                    role: result.role,
                });
                return;
            }
            res.cookie('accessToken', result.accessToken, {
                httpOnly: true,
                secure: process.env.NODE_ENV === 'production',
                sameSite: 'lax',
                maxAge: 15 * 60 * 1000,
            });
            res.cookie('refreshToken', result.refreshToken, {
                httpOnly: true,
                secure: process.env.NODE_ENV === 'production',
                sameSite: 'lax',
                maxAge: 7 * 24 * 60 * 60 * 1000,
            });
            responseHandler_1.ApiResponse.success(res, 'Company user authenticated successfully', result);
        }
        catch (error) {
            next(error);
        }
    }
    static async verifyLoginOtp(req, res, next) {
        try {
            const errors = (0, express_validator_1.validationResult)(req);
            if (!errors.isEmpty()) {
                res.status(400).json({ success: false, errors: errors.array() });
                return;
            }
            const { otpToken, otp } = req.body;
            const result = await companyAuthService_1.CompanyAuthService.verifyLoginOtp(otpToken, otp);
            res.cookie('accessToken', result.accessToken, {
                httpOnly: true,
                secure: process.env.NODE_ENV === 'production',
                sameSite: 'lax',
                maxAge: 15 * 60 * 1000,
            });
            res.cookie('refreshToken', result.refreshToken, {
                httpOnly: true,
                secure: process.env.NODE_ENV === 'production',
                sameSite: 'lax',
                maxAge: 7 * 24 * 60 * 60 * 1000,
            });
            responseHandler_1.ApiResponse.success(res, 'OTP verified successfully', result);
        }
        catch (error) {
            next(error);
        }
    }
    static async validateSession(req, res, next) {
        try {
            const employee = await companyAuthService_1.CompanyAuthService.getCurrentEmployeeProfile(req.user.companyId, req.user.id);
            const user = { ...req.user, theme: employee?.theme || 'blue' };
            responseHandler_1.ApiResponse.success(res, 'Session valid', { user });
        }
        catch (error) {
            next(error);
        }
    }
    static async updateTheme(req, res, next) {
        try {
            const { theme } = req.body || {};
            const updated = await companyAuthService_1.CompanyAuthService.updateEmployeeTheme(req.user.companyId, req.user.id, theme);
            responseHandler_1.ApiResponse.success(res, 'Theme updated successfully', { theme: updated.theme });
        }
        catch (error) {
            next(error);
        }
    }
    static async logout(req, res, next) {
        try {
            if (req.user?.id && req.user.companyId)
                await companyAuthService_1.CompanyAuthService.recordLogout(req.user.id, req.user.companyId);
            res.clearCookie('accessToken');
            res.clearCookie('refreshToken');
            responseHandler_1.ApiResponse.success(res, 'Logged out successfully', null);
        }
        catch (error) {
            next(error);
        }
    }
    static async getDashboard(req, res, next) {
        try {
            const dashboard = await companyAuthService_1.CompanyAuthService.getDashboard(req.user.id, req.user.companyId, req.user.role);
            responseHandler_1.ApiResponse.success(res, 'Company dashboard fetched successfully', dashboard);
        }
        catch (error) {
            next(error);
        }
    }
    static async createEmployee(req, res, next) {
        try {
            const errors = (0, express_validator_1.validationResult)(req);
            if (!errors.isEmpty()) {
                res.status(400).json({ success: false, errors: errors.array() });
                return;
            }
            const employee = await companyAuthService_1.CompanyAuthService.createEmployee(req.user.companyId, req.body);
            responseHandler_1.ApiResponse.success(res, 'Employee created successfully', employee, 201);
        }
        catch (error) {
            next(error);
        }
    }
    static async getEmployees(req, res, next) {
        try {
            const employees = await companyAuthService_1.CompanyAuthService.getEmployees(req.user.companyId, req.user.id);
            responseHandler_1.ApiResponse.success(res, 'Employees fetched successfully', employees);
        }
        catch (error) {
            next(error);
        }
    }
    static async updateEmployeePermissions(req, res, next) {
        try {
            const updatedEmployee = await companyAuthService_1.CompanyAuthService.updateEmployeePermissions(req.user.companyId, req.params.id, req.body.permissions);
            responseHandler_1.ApiResponse.success(res, 'Employee permissions updated successfully', updatedEmployee);
        }
        catch (error) {
            next(error);
        }
    }
    static async updateEmployeeStatus(req, res, next) {
        try {
            const employee = await companyAuthService_1.CompanyAuthService.updateEmployeeStatus(req.user.companyId, req.params.id, Boolean(req.body.isSuspended));
            responseHandler_1.ApiResponse.success(res, `Employee account ${employee.isSuspended ? 'blocked' : 'unblocked'} successfully`, employee);
        }
        catch (error) {
            next(error);
        }
    }
    static async deleteEmployee(req, res, next) {
        try {
            await companyAuthService_1.CompanyAuthService.deleteEmployee(req.user.companyId, req.params.id);
            responseHandler_1.ApiResponse.success(res, 'Employee deleted successfully', { id: req.params.id });
        }
        catch (error) {
            next(error);
        }
    }
    static async updateEmployee(req, res, next) {
        try {
            const errors = (0, express_validator_1.validationResult)(req);
            if (!errors.isEmpty()) {
                res.status(400).json({ success: false, errors: errors.array() });
                return;
            }
            const employee = await companyAuthService_1.CompanyAuthService.updateEmployee(req.user.companyId, req.params.id, req.body);
            responseHandler_1.ApiResponse.success(res, 'Employee updated successfully', employee);
        }
        catch (error) {
            next(error);
        }
    }
    static async createGroup(req, res, next) {
        try {
            const group = await companyAuthService_1.CompanyAuthService.createGroup(req.user.companyId, req.user.id, req.body);
            responseHandler_1.ApiResponse.success(res, 'Group created successfully', group, 201);
        }
        catch (error) {
            next(error);
        }
    }
    static async updateGroup(req, res, next) {
        try {
            const errors = (0, express_validator_1.validationResult)(req);
            if (!errors.isEmpty()) {
                res.status(400).json({ success: false, errors: errors.array() });
                return;
            }
            const group = await companyAuthService_1.CompanyAuthService.updateGroup(req.user.companyId, req.params.groupId, req.body);
            responseHandler_1.ApiResponse.success(res, 'Group updated successfully', group);
        }
        catch (error) {
            next(error);
        }
    }
    static async deleteGroup(req, res, next) {
        try {
            await companyAuthService_1.CompanyAuthService.deleteGroup(req.user.companyId, req.params.groupId);
            responseHandler_1.ApiResponse.success(res, 'Group deleted successfully', { id: req.params.groupId });
        }
        catch (error) {
            next(error);
        }
    }
    static async postMessage(req, res, next) {
        try {
            const message = await companyAuthService_1.CompanyAuthService.postGroupMessage(req.user.companyId, req.user.id, req.user.role, req.params.groupId, req.body);
            const realtimeMessage = await companyAuthService_1.CompanyAuthService.getRealtimeMessage(req.user.companyId, req.user.id, message._id.toString());
            const audience = await companyAuthService_1.CompanyAuthService.getConversationAudience(req.user.companyId, req.params.groupId);
            (0, socket_1.emitUserEvent)([req.user.id], 'message:new', { ...realtimeMessage, isMine: true, conversationId: req.params.groupId });
            (0, socket_1.emitUserEvent)(audience.filter((id) => id !== req.user.id), 'message:new', { ...realtimeMessage, isMine: false, conversationId: req.params.groupId });
            responseHandler_1.ApiResponse.success(res, 'Message posted successfully', message, 201);
        }
        catch (error) {
            next(error);
        }
    }
    static async getGroupMessages(req, res, next) {
        try {
            const messages = await companyAuthService_1.CompanyAuthService.getGroupMessages(req.user.companyId, req.user.id, req.user.role, req.params.groupId);
            responseHandler_1.ApiResponse.success(res, 'Group messages fetched successfully', messages);
        }
        catch (error) {
            next(error);
        }
    }
    static async getConversationMessages(req, res, next) {
        try {
            const messages = await companyAuthService_1.CompanyAuthService.getConversationMessages(req.user.companyId, req.user.id, req.user.role, req.params.conversationId);
            responseHandler_1.ApiResponse.success(res, 'Conversation messages fetched successfully', messages);
        }
        catch (error) {
            next(error);
        }
    }
    static async markConversationRead(req, res, next) {
        try {
            const result = await companyAuthService_1.CompanyAuthService.markConversationRead(req.user.companyId, req.user.id, req.user.role, req.params.conversationId);
            responseHandler_1.ApiResponse.success(res, 'Conversation marked as read', result);
        }
        catch (error) {
            next(error);
        }
    }
    static async postConversationMessage(req, res, next) {
        try {
            const errors = (0, express_validator_1.validationResult)(req);
            if (!errors.isEmpty()) {
                res.status(400).json({ success: false, errors: errors.array() });
                return;
            }
            const message = await companyAuthService_1.CompanyAuthService.postConversationMessage(req.user.companyId, req.user.id, req.user.role, req.params.conversationId, req.body.content);
            const realtimeMessage = await companyAuthService_1.CompanyAuthService.getRealtimeMessage(req.user.companyId, req.user.id, message._id.toString());
            const audience = await companyAuthService_1.CompanyAuthService.getConversationAudience(req.user.companyId, req.params.conversationId);
            (0, socket_1.emitUserEvent)([req.user.id], 'message:new', { ...realtimeMessage, isMine: true, conversationId: req.params.conversationId });
            (0, socket_1.emitUserEvent)(audience.filter((id) => id !== req.user.id), 'message:new', { ...realtimeMessage, isMine: false, conversationId: req.params.conversationId });
            responseHandler_1.ApiResponse.success(res, 'Message posted successfully', message, 201);
        }
        catch (error) {
            next(error);
        }
    }
    static async updateMessage(req, res, next) {
        try {
            const errors = (0, express_validator_1.validationResult)(req);
            if (!errors.isEmpty()) {
                res.status(400).json({ success: false, errors: errors.array() });
                return;
            }
            const message = await companyAuthService_1.CompanyAuthService.updateMessage(req.user.companyId, req.user.id, req.params.messageId, req.body.content);
            if (message.groupId) {
                (0, socket_1.emitConversationEvent)(message.groupId.toString(), 'message:updated', message);
            }
            else {
                const participants = [message.senderId?.toString(), message.recipientId?.toString(), req.user.id].filter(Boolean);
                (0, socket_1.emitDirectEvent)(Array.from(new Set(participants)), 'message:updated', message);
            }
            responseHandler_1.ApiResponse.success(res, 'Message updated successfully', message);
        }
        catch (error) {
            next(error);
        }
    }
    static async deleteMessage(req, res, next) {
        try {
            const result = await companyAuthService_1.CompanyAuthService.deleteMessage(req.user.companyId, req.user.id, req.params.messageId);
            if (result.groupId)
                (0, socket_1.emitConversationEvent)(result.groupId, 'message:deleted', result);
            else
                (0, socket_1.emitDirectEvent)([result.senderId, result.recipientId].filter(Boolean), 'message:deleted', result);
            responseHandler_1.ApiResponse.success(res, 'Message deleted successfully', result);
        }
        catch (error) {
            next(error);
        }
    }
}
exports.CompanyAuthController = CompanyAuthController;
