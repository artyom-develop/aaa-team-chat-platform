import { Server } from 'socket.io';
import { RoomStateService } from '../../services/room-state.service.js';
import { AuthenticatedSocket, MediaControlData } from '../types.js';
import { logger } from '../../utils/logger.js';

/**
 * Обработчики управления медиа (микрофон, камера, демонстрация экрана)
 */
export class MediaControlHandler {
  constructor(private io: Server) {}

  /**
   * Переключение микрофона
   */
  async handleToggleMute(socket: AuthenticatedSocket, data: MediaControlData): Promise<void> {
    const { roomSlug, isMuted } = data;

    try {
      // Проверяем, что пользователь в комнате
      const rooms = Array.from(socket.rooms);
      if (!rooms.includes(roomSlug)) {
        socket.emit('room:error', { message: 'Вы не находитесь в этой комнате' });
        return;
      }

      // Обновляем состояние в Redis
      if (socket.userId && isMuted !== undefined) {
        await RoomStateService.updateParticipant(roomSlug, socket.userId, { isMuted });
      }

      // Транслируем изменение состояния микрофона всем в комнате
      this.io.to(roomSlug).emit('media:control', {
        userId: socket.userId || '',
        roomSlug,
        isMuted,
      });

      logger.info(`User ${socket.userId} ${isMuted ? 'muted' : 'unmuted'} in room ${roomSlug}`);
    } catch (error) {
      logger.error('Toggle mute error:', error);
    }
  }

  /**
   * Переключение камеры
   */
  async handleToggleCamera(socket: AuthenticatedSocket, data: MediaControlData): Promise<void> {
    const { roomSlug, isCameraOff } = data;

    try {
      // Проверяем, что пользователь в комнате
      const rooms = Array.from(socket.rooms);
      if (!rooms.includes(roomSlug)) {
        socket.emit('room:error', { message: 'Вы не находитесь в этой комнате' });
        return;
      }

      // Обновляем состояние в Redis
      if (socket.userId && isCameraOff !== undefined) {
        await RoomStateService.updateParticipant(roomSlug, socket.userId, { isCameraOff });
      }

      // Транслируем изменение состояния камеры всем в комнате
      this.io.to(roomSlug).emit('media:control', {
        userId: socket.userId || '',
        roomSlug,
        isCameraOff,
      });

      logger.info(`User ${socket.userId} ${isCameraOff ? 'disabled' : 'enabled'} camera in room ${roomSlug}`);
    } catch (error) {
      logger.error('Toggle camera error:', error);
    }
  }

  /**
   * Переключение демонстрации экрана
   */
  async handleToggleScreen(socket: AuthenticatedSocket, data: MediaControlData): Promise<void> {
    const { roomSlug, isScreenSharing } = data;

    try {
      // Проверяем, что пользователь в комнате
      const rooms = Array.from(socket.rooms);
      if (!rooms.includes(roomSlug)) {
        socket.emit('room:error', { message: 'Вы не находитесь в этой комнате' });
        return;
      }

      // Обновляем состояние в Redis
      if (socket.userId && isScreenSharing !== undefined) {
        await RoomStateService.updateParticipant(roomSlug, socket.userId, { isScreenSharing });
      }

      // Транслируем изменение состояния демонстрации экрана всем в комнате
      this.io.to(roomSlug).emit('media:control', {
        userId: socket.userId || '',
        roomSlug,
        isScreenSharing,
      });

      logger.info(`User ${socket.userId} ${isScreenSharing ? 'started' : 'stopped'} screen sharing in room ${roomSlug}`);
    } catch (error) {
      logger.error('Toggle screen error:', error);
    }
  }
}
