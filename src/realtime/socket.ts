import { Server } from 'socket.io';
import { verifyAccessToken } from '../utils/jwt';
import { CompanyAuthService } from '../services/companyAuthService';
import { Roles } from '../constants/index';

let io: Server | null = null;

const employeeRoles = [Roles.COMPANY_ADMIN, Roles.HR, Roles.MANAGER, Roles.TEAM_LEAD, Roles.EMPLOYEE, Roles.SALES, Roles.TECH_SUPPORT, Roles.IT, Roles.INTERN];
const allowedOrigins = (process.env.CLIENT_URL || 'http://localhost:3000')
  .split(',')
  .map((url) => url.trim())
  .filter(Boolean);

export const configureSocket = (server: import('http').Server) => {
  io = new Server(server, {
    cors: {
      origin: allowedOrigins,
      credentials: true,
    },
  });

  io.use((socket, next) => {
    try {
      const token = socket.handshake.auth?.token || socket.handshake.headers.cookie?.match(/(?:^|; )accessToken=([^;]+)/)?.[1];
      if (!token) return next(new Error('Authentication token required.'));
      socket.data.user = verifyAccessToken(token);
      if (!employeeRoles.includes(socket.data.user.role)) return next(new Error('Forbidden.'));
      next();
    } catch {
      next(new Error('Invalid or expired authentication token.'));
    }
  });

  io.on('connection', (socket) => {
    const user = socket.data.user;
    socket.join(`user:${user.id}`);

    socket.on('conversation:join', async (conversationId: string, acknowledge?: (allowed: boolean) => void) => {
      try {
        const allowed = await CompanyAuthService.canAccessConversation(user.companyId, user.id, user.role, conversationId);
        if (!allowed) {
          acknowledge?.(false);
          return;
        }
        socket.join(`conversation:${conversationId}`);
        acknowledge?.(true);
      } catch {
        acknowledge?.(false);
      }
    });

    socket.on('conversation:leave', (conversationId: string) => {
      socket.leave(`conversation:${conversationId}`);
    });

    socket.on('conversation:read', async (conversationId: string) => {
      try {
        const result = await CompanyAuthService.markConversationRead(user.companyId, user.id, user.role, conversationId);
        emitUserEvent(result.senderIds, 'message:read', { conversationId, messageIds: result.messageIds, readerId: user.id });
      } catch {
        // Read receipts are best effort and must not disconnect the chat socket.
      }
    });
  });

  return io;
};

export const emitConversationEvent = (conversationId: string, event: string, payload: unknown) => {
  io?.to(`conversation:${conversationId}`).emit(event, payload);
};

export const emitDirectEvent = (participantIds: string[], event: string, payload: unknown) => {
  participantIds.forEach((id) => io?.to(`conversation:${id}`).emit(event, payload));
};

export const emitUserEvent = (userIds: string[], event: string, payload: unknown) => {
  userIds.forEach((id) => io?.to(`user:${id}`).emit(event, payload));
};

export const disconnectUser = async (userId: string) => {
  try {
    if (!io) return;
    const sockets = await io.in(`user:${userId}`).fetchSockets();
    for (const s of sockets) {
      s.disconnect(true);
    }
  } catch (err) {
    // ignore
  }
};
