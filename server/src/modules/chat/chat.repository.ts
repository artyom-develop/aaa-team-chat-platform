import { prisma } from '../../database/prisma.client.js';
import { ChatMessage } from '../../generated/prisma/index.js';
import { ICreateMessageData, IMessageWithUser, IChatRepository } from './interfaces/chat.interfaces.js';

export class ChatRepository implements IChatRepository {
  /**
   * Получение сообщений комнаты с пагинацией
   */
  async findByRoomId(roomId: string, skip = 0, take = 50): Promise<IMessageWithUser[]> {
    return prisma.chatMessage.findMany({
      where: { roomId },
      skip,
      take,
      orderBy: { createdAt: 'asc' },
      include: {
        user: {
          select: {
            id: true,
            displayName: true,
            avatarUrl: true,
          },
        },
        replyTo: {
          select: {
            id: true,
            text: true,
            user: {
              select: {
                displayName: true,
              },
            },
          },
        },
      },
    }) as Promise<IMessageWithUser[]>;
  }

  /**
   * Получение сообщения по ID
   */
  async findById(id: string): Promise<IMessageWithUser | null> {
    return prisma.chatMessage.findUnique({
      where: { id },
      include: {
        user: {
          select: {
            id: true,
            displayName: true,
            avatarUrl: true,
          },
        },
        replyTo: {
          select: {
            id: true,
            text: true,
            user: {
              select: {
                displayName: true,
              },
            },
          },
        },
      },
    }) as Promise<IMessageWithUser | null>;
  }

  /**
   * Создание нового сообщения
   */
  async create(data: ICreateMessageData): Promise<ChatMessage> {
    return prisma.chatMessage.create({
      data,
    });
  }

  /**
   * Подсчёт количества сообщений в комнате
   */
  async countByRoomId(roomId: string): Promise<number> {
    return prisma.chatMessage.count({
      where: { roomId },
    });
  }
}
