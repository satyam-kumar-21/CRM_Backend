"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.disconnectUser = exports.emitCompanyEvent = exports.emitUserEvent = exports.emitDirectEvent = exports.emitConversationEvent = exports.configureSocket = void 0;
const socket_io_1 = require("socket.io");
const jwt_1 = require("../utils/jwt");
const companyAuthService_1 = require("../services/companyAuthService");
const index_1 = require("../constants/index");
let io = null;
const employeeRoles = [index_1.Roles.COMPANY_ADMIN, index_1.Roles.HR, index_1.Roles.MANAGER, index_1.Roles.TEAM_LEAD, index_1.Roles.EMPLOYEE, index_1.Roles.SALES, index_1.Roles.TECH_SUPPORT, index_1.Roles.IT, index_1.Roles.INTERN];
const allowedOrigins = (process.env.CLIENT_URL || 'http://localhost:3000')
    .split(',')
    .map((url) => url.trim())
    .filter(Boolean);
const configureSocket = (server) => {
    io = new socket_io_1.Server(server, {
        cors: {
            origin: allowedOrigins,
            credentials: true,
        },
    });
    io.use((socket, next) => {
        try {
            const token = socket.handshake.auth?.token || socket.handshake.headers.cookie?.match(/(?:^|; )accessToken=([^;]+)/)?.[1];
            if (!token)
                return next(new Error('Authentication token required.'));
            socket.data.user = (0, jwt_1.verifyAccessToken)(token);
            if (!employeeRoles.includes(socket.data.user.role))
                return next(new Error('Forbidden.'));
            next();
        }
        catch {
            next(new Error('Invalid or expired authentication token.'));
        }
    });
    io.on('connection', (socket) => {
        const user = socket.data.user;
        socket.join(`user:${user.id}`);
        socket.on('conversation:join', async (conversationId, acknowledge) => {
            try {
                const allowed = await companyAuthService_1.CompanyAuthService.canAccessConversation(user.companyId, user.id, user.role, conversationId);
                if (!allowed) {
                    acknowledge?.(false);
                    return;
                }
                socket.join(`conversation:${conversationId}`);
                acknowledge?.(true);
            }
            catch {
                acknowledge?.(false);
            }
        });
        socket.on('conversation:leave', (conversationId) => {
            socket.leave(`conversation:${conversationId}`);
        });
        socket.on('conversation:read', async (conversationId) => {
            try {
                const result = await companyAuthService_1.CompanyAuthService.markConversationRead(user.companyId, user.id, user.role, conversationId);
                (0, exports.emitUserEvent)(result.senderIds, 'message:read', { conversationId, messageIds: result.messageIds, readerId: user.id });
            }
            catch {
                // Read receipts are best effort and must not disconnect the chat socket.
            }
        });
    });
    return io;
};
exports.configureSocket = configureSocket;
const emitConversationEvent = (conversationId, event, payload) => {
    io?.to(`conversation:${conversationId}`).emit(event, payload);
};
exports.emitConversationEvent = emitConversationEvent;
const emitDirectEvent = (participantIds, event, payload) => {
    participantIds.forEach((id) => {
        io?.to(`user:${id}`).emit(event, payload);
        io?.to(`conversation:${id}`).emit(event, payload);
    });
};
exports.emitDirectEvent = emitDirectEvent;
const emitUserEvent = (userIds, event, payload) => {
    userIds.forEach((id) => io?.to(`user:${id}`).emit(event, payload));
};
exports.emitUserEvent = emitUserEvent;
const emitCompanyEvent = (event, payload) => {
    io?.emit(event, payload);
};
exports.emitCompanyEvent = emitCompanyEvent;
const disconnectUser = async (userId) => {
    try {
        if (!io)
            return;
        const sockets = await io.in(`user:${userId}`).fetchSockets();
        for (const s of sockets) {
            s.disconnect(true);
        }
    }
    catch (err) {
        // ignore
    }
};
exports.disconnectUser = disconnectUser;
