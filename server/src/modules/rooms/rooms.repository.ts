import { prisma } from '../../database/prisma.client.js';
import { Room } from '../../generated/prisma/index.js';
import { ICreateRoomData, IUpdateRoomData, IRoomWithHost, IRoomsRepository } from './interfaces/room.interfaces.js';
import { SlugUtil } from '../../utils/slug.util.js';

export class RoomsRepository implements IRoomsRepository {
  /**
   * Поиск комнаты по ID
   */
  async findById(id: string): Promise<Room | null> {
    return prisma.room.findUnique({
      where: { id },
    });
  }

  /**
   * Поиск комнаты по slug
   */
  async findBySlug(slug: string): Promise<Room | null> {
    return prisma.room.findUnique({
      where: { slug },
    });
  }

  /**
   * Поиск комнаты по slug с информацией о хосте
   */
  async findBySlugWithHost(slug: string): Promise<IRoomWithHost | null> {
    return prisma.room.findUnique({
      where: { slug },
      include: {
        host: {
          select: {
            id: true,
            displayName: true,
            avatarUrl: true,
          },
        },
      },
    }) as Promise<IRoomWithHost | null>;
  }

  /**
   * Поиск всех комнат созданных пользователем
   */
  async findByHostId(hostId: string): Promise<Room[]> {
    return prisma.room.findMany({
      where: { hostId },
      orderBy: { createdAt: 'desc' },
    });
  }

  /**
   * Получение активных комнат с пагинацией
   */
  async findActive(skip = 0, take = 10): Promise<Room[]> {
    return prisma.room.findMany({
      skip,
      take,
      orderBy: { createdAt: 'desc' },
    });
  }

  /**
   * Создание новой комнаты
   */
  async create(data: ICreateRoomData): Promise<Room> {
    // Генерируем уникальный slug
    let slug = SlugUtil.generateRoomSlug();
    let attempts = 0;
    const maxAttempts = 10;

    // Проверяем уникальность slug (очень маловероятно, что будут коллизии)
    while (attempts < maxAttempts) {
      const existing = await this.findBySlug(slug);
      if (!existing) break;
      slug = SlugUtil.generateRoomSlug();
      attempts++;
    }

    return prisma.room.create({
      data: {
        ...data,
        slug,
      },
    });
  }

  /**
   * Обновление данных комнаты
   */
  async update(id: string, data: IUpdateRoomData): Promise<Room> {
    return prisma.room.update({
      where: { id },
      data,
    });
  }

  /**
   * Обновление хоста комнаты
   */
  async updateHost(id: string, hostId: string): Promise<Room> {
    return prisma.room.update({
      where: { id },
      data: { hostId },
    });
  }

  /**
   * Удаление комнаты
   */
  async delete(id: string): Promise<void> {
    await prisma.room.delete({
      where: { id },
    });
  }

  /**
   * Подсчёт количества комнат
   */
  async count(): Promise<number> {
    return prisma.room.count();
  }
}
