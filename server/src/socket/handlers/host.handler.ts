import { Server } from 'socket.io';
import { RoomStateService } from '../../services/room-state.service.js';
import { RoomsRepository } from '../../modules/rooms/rooms.repository.js';
import { AuthenticatedSocket } from '../types.js';
import { logger } from '../../utils/logger.js';

const roomsRepository = new RoomsRepository();

/**
 * Обработчики действий хоста комнаты
 */
export class HostHandler {
  constructor(private io: Server) {}

  /**
   * Удаление пользователя из комнаты (только для хоста)
   */
  async handleKickUser(
    socket: AuthenticatedSocket,
    data: { targetUserId: string; roomSlug: string }
  ): Promise<void> {
    const { targetUserId, roomSlug } = data;

    try {
      // Проверяем, что пользователь является хостом комнаты
      const room = await roomsRepository.findBySlug(roomSlug);
      if (!room) {
        socket.emit('room:error', { message: 'Комната не найдена' });
        return;
      }

      if (room.hostId !== socket.userId) {
        socket.emit('room:error', { message: 'Только хост может удалять участников' });
        return;
      }

      // Находим сокет целевого пользователя
      const socketsInRoom = await this.io.in(roomSlug).fetchSockets();
      const targetSocket = socketsInRoom.find(
        (s) => ((s as unknown) as AuthenticatedSocket).userId === targetUserId
      );

      if (!targetSocket) {
        logger.warn(`Target user ${targetUserId} not found in room ${roomSlug}`);
        return;
      }

      // Удаляем пользователя из Redis
      await RoomStateService.removeParticipant(roomSlug, targetUserId);

      // Отправляем уведомление удаляемому пользователю
      targetSocket.emit('user:kicked');
      
      // Удаляем пользователя из комнаты Socket.io
      targetSocket.leave(roomSlug);

      // Уведомляем остальных участников
      this.io.to(roomSlug).emit('room:user-left', { userId: targetUserId });

      logger.info(`User ${targetUserId} was kicked from room ${roomSlug} by host ${socket.userId}`);
    } catch (error) {
      logger.error('Kick user error:', error);
      socket.emit('room:error', { message: 'Не удалось удалить пользователя' });
    }
  }

  /**
   * Передача прав хоста другому пользователю
   */
  async handleTransferHost(
    socket: AuthenticatedSocket,
    data: { targetUserId: string; roomSlug: string }
  ): Promise<void> {
    const { targetUserId, roomSlug } = data;

    try {
      // Проверяем, что пользователь является хостом комнаты
      const room = await roomsRepository.findBySlug(roomSlug);
      if (!room) {
        socket.emit('room:error', { message: 'Комната не найдена' });
        return;
      }

      if (room.hostId !== socket.userId) {
        socket.emit('room:error', { message: 'Только хост может передавать права' });
        return;
      }

      // Проверяем, что целевой пользователь в комнате
      const participants = await RoomStateService.getParticipants(roomSlug);
      const targetParticipant = participants.find((p) => p.userId === targetUserId);

      if (!targetParticipant) {
        socket.emit('room:error', { message: 'Пользователь не найден в комнате' });
        return;
      }

      // Обновляем хоста в базе данных
      await roomsRepository.updateHost(room.id, targetUserId);

      // Обновляем статус isHost в Redis для участников
      await RoomStateService.updateParticipant(roomSlug, socket.userId!, { isHost: false });
      await RoomStateService.updateParticipant(roomSlug, targetUserId, { isHost: true });

      // Уведомляем всех участников о смене хоста
      this.io.to(roomSlug).emit('host:changed', {
        newHostId: targetUserId,
        newHostName: targetParticipant.displayName,
      });

      logger.info(`Host transferred from ${socket.userId} to ${targetUserId} in room ${roomSlug}`);
    } catch (error) {
      logger.error('Transfer host error:', error);
      socket.emit('room:error', { message: 'Не удалось передать права хоста' });
    }
  }
}
