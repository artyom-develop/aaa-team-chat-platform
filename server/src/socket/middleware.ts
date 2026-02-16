import { Socket } from 'socket.io';
import { JwtUtil } from '../utils/jwt.util.js';
import { UsersRepository } from '../modules/users/users.repository.js';
import { TokenBlacklistService } from '../services/token-blacklist.service.js';
import { AuthenticatedSocket } from './types.js';
import { logger } from '../utils/logger.js';

const usersRepository = new UsersRepository();

/**
 * Middleware для аутентификации Socket.io соединений
 */
export const socketAuthMiddleware = async (
  socket: Socket,
  next: (err?: Error) => void
): Promise<void> => {
  try {
    // Получаем token из handshake (query или auth)
    const token = 
      socket.handshake.auth?.token || 
      socket.handshake.query?.token as string;

    if (!token) {
      return next(new Error('Authentication error: No token provided'));
    }

    // Проверяем, не в черном списке ли токен
    const isBlacklisted = await TokenBlacklistService.isBlacklisted(token);
    if (isBlacklisted) {
      return next(new Error('Authentication error: Token is invalid'));
    }

    // Верифицируем токен
    const payload = JwtUtil.verifyToken(token);
    if (!payload) {
      return next(new Error('Authentication error: Invalid token'));
    }

    // Проверяем существование пользователя
    const user = await usersRepository.findById(payload.id);
    if (!user) {
      return next(new Error('Authentication error: User not found'));
    }

    // Проверяем активность пользователя
    if (!user.isActive) {
      return next(new Error('Authentication error: User is blocked'));
    }

    // Проверяем версию токена
    if (user.tokenVersion !== payload.tokenVersion) {
      return next(new Error('Authentication error: Token version mismatch'));
    }

    // Добавляем данные пользователя в socket
    const authSocket = socket as AuthenticatedSocket;
    authSocket.userId = user.id;
    authSocket.displayName = user.displayName;
    authSocket.email = user.email;

    logger.info(`Socket authenticated: userId=${user.id}, displayName=${user.displayName}`);
    
    next();
  } catch (error) {
    logger.error('Socket authentication error:', error);
    next(new Error('Authentication error: Failed to authenticate'));
  }
};
