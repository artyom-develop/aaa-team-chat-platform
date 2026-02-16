import { Server } from 'socket.io';
import { ChatRepository } from '../../modules/chat/chat.repository.js';
import { RoomsRepository } from '../../modules/rooms/rooms.repository.js';
import { AuthenticatedSocket, ChatMessageData, ChatMessageResponse } from '../types.js';
import { logger } from '../../utils/logger.js';

const chatRepository = new ChatRepository();
const roomsRepository = new RoomsRepository();

/**
 * Обработчики чата
 */
export class ChatHandler {
  constructor(private io: Server) {}

  /**
   * Отправка сообщения в чат
   */
  async handleSendMessage(
    socket: AuthenticatedSocket,
    data: ChatMessageData,
    callback: (response: { success: boolean; error?: string; message?: ChatMessageResponse }) => void
  ): Promise<void> {
    const { roomSlug, text, replyToId } = data;

    try {
      // Проверяем, что пользователь в комнате
      const rooms = Array.from(socket.rooms);
      if (!rooms.includes(roomSlug)) {
        return callback({ success: false, error: 'Вы не находитесь в этой комнате' });
      }

      // Находим комнату в БД
      const room = await roomsRepository.findBySlug(roomSlug);
      if (!room) {
        return callback({ success: false, error: 'Комната не найдена' });
      }

      // Валидация текста
      if (!text || text.trim().length === 0) {
        return callback({ success: false, error: 'Сообщение не может быть пустым' });
      }

      if (text.length > 1000) {
        return callback({ success: false, error: 'Сообщение слишком длинное (макс. 1000 символов)' });
      }

      // Сохраняем сообщение в БД
      const message = await chatRepository.create({
        roomId: room.id,
        userId: socket.userId || '',
        text: text.trim(),
        replyToId: replyToId || undefined,
      });

      // Загружаем полные данные сообщения с пользователем по ID
      const fullMessage = await chatRepository.findById(message.id);

      if (!fullMessage) {
        logger.error(`Failed to load message after creation: ${message.id}`);
        return callback({ success: false, error: 'Не удалось загрузить сообщение' });
      }

      const messageResponse: ChatMessageResponse = {
        id: fullMessage.id,
        text: fullMessage.text,
        createdAt: fullMessage.createdAt,
        user: fullMessage.user,
        replyTo: fullMessage.replyTo || null,
      };

      logger.info(`Chat message sent by ${socket.userId} in room ${roomSlug}`);

      // Отправляем подтверждение отправителю
      callback({ success: true, message: messageResponse });

      // Транслируем сообщение всем в комнате (включая отправителя)
      this.io.to(roomSlug).emit('chat:message', messageResponse);
    } catch (error) {
      logger.error('Chat send message error:', error);
      callback({ success: false, error: 'Не удалось отправить сообщение' });
    }
  }
}
