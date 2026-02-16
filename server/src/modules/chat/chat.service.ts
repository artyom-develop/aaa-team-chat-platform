import { ChatRepository } from './chat.repository.js';
import { RoomsRepository } from '../rooms/rooms.repository.js';
import { IMessageWithUser } from './interfaces/chat.interfaces.js';
import { NotFoundException } from '../../shared/exceptions/index.js';

export class ChatService {
  constructor(
    private readonly chatRepository: ChatRepository,
    private readonly roomsRepository: RoomsRepository
  ) {}

  /**
   * Получение истории сообщений комнаты
   */
  async getMessages(
    roomSlug: string,
    page = 1,
    limit = 50
  ): Promise<{ messages: IMessageWithUser[]; total: number; page: number; limit: number }> {
    // Проверяем существование комнаты
    const room = await this.roomsRepository.findBySlug(roomSlug);
    if (!room) {
      throw new NotFoundException('Комната не найдена');
    }

    const skip = (page - 1) * limit;
    const [messages, total] = await Promise.all([
      this.chatRepository.findByRoomId(room.id, skip, limit),
      this.chatRepository.countByRoomId(room.id),
    ]);

    return {
      messages,
      total,
      page,
      limit,
    };
  }
}
