import { Server } from 'socket.io';
import { RoomsRepository } from '../../modules/rooms/rooms.repository.js';
import { ArgonUtil } from '../../utils/argon.util.js';
import { RoomStateService, RoomParticipant } from '../../services/room-state.service.js';
import { AuthenticatedSocket, RoomJoinData, RoomLeaveData, ParticipantData } from '../types.js';
import { logger } from '../../utils/logger.js';

const roomsRepository = new RoomsRepository();

/**
 * Обработчики событий комнаты
 */
export class RoomHandler {
  constructor(private io: Server) {}

  /**
   * Присоединение к комнате
   */
  async handleJoin(
    socket: AuthenticatedSocket,
    data: RoomJoinData,
    callback: (response: { success: boolean; error?: string }) => void
  ): Promise<void> {
    try {
      const { roomSlug, password, isMuted = false, isCameraOff = false } = data;

      // Проверяем существование комнаты
      const room = await roomsRepository.findBySlugWithHost(roomSlug);
      if (!room) {
        return callback({ success: false, error: 'Комната не найдена' });
      }

      // Проверяем пароль, если есть
      if (room.password) {
        if (!password) {
          return callback({ success: false, error: 'Требуется пароль для входа в комнату' });
        }

        const isPasswordValid = await ArgonUtil.verifyPassword(room.password, password);
        if (!isPasswordValid) {
          return callback({ success: false, error: 'Неверный пароль' });
        }
      }

      // Добавляем пользователя в комнату Socket.io
      await socket.join(roomSlug);

      // Создаём участника
      const participant: RoomParticipant = {
        userId: socket.userId || '',
        displayName: socket.displayName || 'Unknown',
        avatarUrl: null,
        socketId: socket.id,
        joinedAt: Date.now(),
        isMuted,
        isCameraOff,
        isScreenSharing: false,
        isHost: socket.userId === room.hostId,
      };

      // Сохраняем участника в Redis
      await RoomStateService.addParticipant(roomSlug, participant);

      // Получаем список всех участников из Redis
      const participants = await RoomStateService.getParticipants(roomSlug);
      const participantsData: ParticipantData[] = participants.map((p) => ({
        userId: p.userId,
        displayName: p.displayName,
        avatarUrl: p.avatarUrl,
        isMuted: p.isMuted,
        isCameraOff: p.isCameraOff,
        isScreenSharing: p.isScreenSharing,
        isHost: p.isHost,
      }));

      logger.info(`User ${socket.userId} joined room ${roomSlug}`);

      // Отправляем подтверждение присоединения с списком участников
      callback({ success: true });
      socket.emit('room:joined', { roomSlug, participants: participantsData });

      // Уведомляем других участников о новом пользователе
      const newParticipant: ParticipantData = {
        userId: participant.userId,
        displayName: participant.displayName,
        avatarUrl: participant.avatarUrl,
        isMuted: participant.isMuted,
        isCameraOff: participant.isCameraOff,
        isScreenSharing: participant.isScreenSharing,
        isHost: participant.isHost,
      };

      socket.to(roomSlug).emit('room:user-joined', newParticipant);
      
      // Сообщаем новому участнику, что он должен создать offers для всех существующих
      // (это важно для переподключения при reload)
      socket.emit('room:request-offers', { participants: participantsData });
    } catch (error) {
      logger.error('Room join error:', error);
      callback({ success: false, error: 'Не удалось присоединиться к комнате' });
    }
  }

  /**
   * Выход из комнаты
   */
  async handleLeave(socket: AuthenticatedSocket, data: RoomLeaveData): Promise<void> {
    const { roomSlug } = data;

    try {
      await socket.leave(roomSlug);

      // Удаляем участника из Redis
      if (socket.userId) {
        await RoomStateService.removeParticipant(roomSlug, socket.userId);
      }

      // Уведомляем других участников о выходе
      socket.to(roomSlug).emit('room:user-left', { userId: socket.userId || '' });

      logger.info(`User ${socket.userId} left room ${roomSlug}`);
    } catch (error) {
      logger.error('Room leave error:', error);
    }
  }

  /**
   * Отключение пользователя (автоматический выход из всех комнат)
   */
  async handleDisconnect(socket: AuthenticatedSocket): Promise<void> {
    logger.info(`Socket disconnected: userId=${socket.userId}`);

    // Получаем комнаты, в которых находится пользователь
    const rooms = Array.from(socket.rooms).filter((room) => room !== socket.id);
    
    for (const roomSlug of rooms) {
      // Удаляем участника из Redis
      if (socket.userId) {
        await RoomStateService.removeParticipant(roomSlug, socket.userId);
      }

      // Уведомляем других участников о выходе
      socket.to(roomSlug).emit('room:user-left', { userId: socket.userId || '' });
    }
  }
}
