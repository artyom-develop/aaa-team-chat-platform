import { redisClient } from '../config/redis.config.js';
import { logger } from '../utils/logger.js';

/**
 * Интерфейс участника комнаты в Redis
 */
export interface RoomParticipant {
  userId: string;
  displayName: string;
  avatarUrl: string | null;
  socketId: string;
  joinedAt: number; // timestamp
  isMuted: boolean;
  isCameraOff: boolean;
  isScreenSharing: boolean;
  isHost: boolean;
}

/**
 * Интерфейс данных комнаты в Redis
 */
export interface RoomState {
  roomSlug: string;
  participants: RoomParticipant[];
  createdAt: number;
}

/**
 * Сервис для управления состоянием комнат в Redis
 */
export class RoomStateService {
  private static readonly ROOM_PREFIX = 'room:';
  private static readonly PARTICIPANT_PREFIX = 'participant:';
  private static readonly USER_ROOMS_PREFIX = 'user-rooms:';
  private static readonly ROOM_TTL = 6 * 60 * 60; // ✅ 6 часов (21600 секунд) для экономии памяти

  /**
   * Добавить участника в комнату
   */
  static async addParticipant(
    roomSlug: string,
    participant: RoomParticipant
  ): Promise<void> {
    try {
      const key = this.ROOM_PREFIX + roomSlug;
      const participantKey = `${this.PARTICIPANT_PREFIX}${roomSlug}:${participant.userId}`;

      // Сохраняем участника
      await redisClient.setEx(
        participantKey,
        this.ROOM_TTL,
        JSON.stringify(participant)
      );

      // Добавляем userId в set участников комнаты
      await redisClient.sAdd(key, participant.userId);
      await redisClient.expire(key, this.ROOM_TTL);

      // Отслеживаем в каких комнатах находится пользователь
      const userRoomsKey = this.USER_ROOMS_PREFIX + participant.userId;
      await redisClient.sAdd(userRoomsKey, roomSlug);
      await redisClient.expire(userRoomsKey, this.ROOM_TTL);

      logger.info(`Participant ${participant.userId} added to room ${roomSlug}`);
    } catch (error) {
      logger.error('Error adding participant to room:', error);
      throw error;
    }
  }

  /**
   * Удалить участника из комнаты
   */
  static async removeParticipant(roomSlug: string, userId: string): Promise<void> {
    try {
      const key = this.ROOM_PREFIX + roomSlug;
      const participantKey = `${this.PARTICIPANT_PREFIX}${roomSlug}:${userId}`;

      // Удаляем участника
      await redisClient.del(participantKey);
      await redisClient.sRem(key, userId);

      // Удаляем комнату из списка комнат пользователя
      const userRoomsKey = this.USER_ROOMS_PREFIX + userId;
      await redisClient.sRem(userRoomsKey, roomSlug);

      logger.info(`Participant ${userId} removed from room ${roomSlug}`);

      // Проверяем, остались ли участники
      const count = await redisClient.sCard(key);
      if (count === 0) {
        // Удаляем комнату, если она пустая
        await redisClient.del(key);
        logger.info(`Room ${roomSlug} is empty and removed from Redis`);
      }
    } catch (error) {
      logger.error('Error removing participant from room:', error);
      throw error;
    }
  }

  /**
   * Получить всех участников комнаты
   */
  static async getParticipants(roomSlug: string): Promise<RoomParticipant[]> {
    try {
      const key = this.ROOM_PREFIX + roomSlug;

      // Получаем список userIds
      const userIds = await redisClient.sMembers(key);

      if (userIds.length === 0) {
        return [];
      }

      // Получаем данные всех участников
      const participants: RoomParticipant[] = [];
      for (const userId of userIds) {
        const participantKey = `${this.PARTICIPANT_PREFIX}${roomSlug}:${userId}`;
        const data = await redisClient.get(participantKey);
        if (data) {
          participants.push(JSON.parse(data));
        }
      }

      return participants;
    } catch (error) {
      logger.error('Error getting room participants:', error);
      return [];
    }
  }

  /**
   * Получить участника
   */
  static async getParticipant(
    roomSlug: string,
    userId: string
  ): Promise<RoomParticipant | null> {
    try {
      const participantKey = `${this.PARTICIPANT_PREFIX}${roomSlug}:${userId}`;
      const data = await redisClient.get(participantKey);
      return data ? JSON.parse(data) : null;
    } catch (error) {
      logger.error('Error getting participant:', error);
      return null;
    }
  }

  /**
   * Обновить состояние участника
   */
  static async updateParticipant(
    roomSlug: string,
    userId: string,
    updates: Partial<RoomParticipant>
  ): Promise<void> {
    try {
      const participant = await this.getParticipant(roomSlug, userId);
      if (!participant) {
        logger.warn(`Participant ${userId} not found in room ${roomSlug}`);
        return;
      }

      const updated = { ...participant, ...updates };
      const participantKey = `${this.PARTICIPANT_PREFIX}${roomSlug}:${userId}`;
      
      await redisClient.setEx(
        participantKey,
        this.ROOM_TTL,
        JSON.stringify(updated)
      );

      logger.debug(`Participant ${userId} updated in room ${roomSlug}`);
    } catch (error) {
      logger.error('Error updating participant:', error);
      throw error;
    }
  }

  /**
   * Получить количество участников в комнате
   */
  static async getParticipantCount(roomSlug: string): Promise<number> {
    try {
      const key = this.ROOM_PREFIX + roomSlug;
      return await redisClient.sCard(key);
    } catch (error) {
      logger.error('Error getting participant count:', error);
      return 0;
    }
  }

  /**
   * Проверить, находится ли пользователь в комнате
   */
  static async isUserInRoom(roomSlug: string, userId: string): Promise<boolean> {
    try {
      const key = this.ROOM_PREFIX + roomSlug;
      const result = await redisClient.sIsMember(key, userId);
      return Boolean(result);
    } catch (error) {
      logger.error('Error checking user in room:', error);
      return false;
    }
  }

  /**
   * Получить все комнаты, в которых находится пользователь
   */
  static async getUserRooms(userId: string): Promise<string[]> {
    try {
      const userRoomsKey = this.USER_ROOMS_PREFIX + userId;
      return await redisClient.sMembers(userRoomsKey);
    } catch (error) {
      logger.error('Error getting user rooms:', error);
      return [];
    }
  }

  /**
   * Очистить комнату (удалить всех участников)
   */
  static async clearRoom(roomSlug: string): Promise<void> {
    try {
      const participants = await this.getParticipants(roomSlug);
      
      // Удаляем всех участников
      for (const participant of participants) {
        const participantKey = `${this.PARTICIPANT_PREFIX}${roomSlug}:${participant.userId}`;
        await redisClient.del(participantKey);
      }

      // Удаляем комнату
      const key = this.ROOM_PREFIX + roomSlug;
      await redisClient.del(key);

      logger.info(`Room ${roomSlug} cleared`);
    } catch (error) {
      logger.error('Error clearing room:', error);
      throw error;
    }
  }
}
