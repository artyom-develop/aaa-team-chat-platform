import { Room } from '../../generated/prisma/index.js';
import { RoomsRepository } from './rooms.repository.js';
import { ICreateRoomData, IUpdateRoomData, IRoomWithHost } from './interfaces/room.interfaces.js';
import { ArgonUtil } from '../../utils/argon.util.js';
import {
  NotFoundException,
  BadRequestException,
  ForbiddenException,
  UnauthorizedException,
} from '../../shared/exceptions/index.js';
import { IUserPayload } from '../../shared/types/express.types.js';

export class RoomsService {
  constructor(private readonly roomsRepository: RoomsRepository) {}

  /**
   * Создание новой комнаты
   */
  async createRoom(
    data: Omit<ICreateRoomData, 'hostId'>,
    userId: string
  ): Promise<Room> {
    // Хешируем пароль, если он указан
    let hashedPassword: string | undefined = undefined;
    if (data.password) {
      hashedPassword = await ArgonUtil.hashPassword(data.password);
    }

    const room = await this.roomsRepository.create({
      ...data,
      password: hashedPassword,
      hostId: userId,
    });

    return room;
  }

  /**
   * Получение комнаты по slug с информацией о хосте
   */
  async getRoomBySlug(slug: string): Promise<IRoomWithHost> {
    const room = await this.roomsRepository.findBySlugWithHost(slug);
    
    if (!room) {
      throw new NotFoundException('Комната не найдена');
    }

    return room;
  }

  /**
   * Проверка пароля комнаты при присоединении
   */
  async joinRoom(slug: string, password?: string): Promise<IRoomWithHost> {
    const room = await this.getRoomBySlug(slug);

    // Если у комнаты есть пароль, проверяем его
    if (room.password) {
      if (!password) {
        throw new UnauthorizedException('Требуется пароль для входа в комнату');
      }

      const isPasswordValid = await ArgonUtil.verifyPassword(room.password, password);
      if (!isPasswordValid) {
        throw new UnauthorizedException('Неверный пароль');
      }
    }

    return room;
  }

  /**
   * Получение комнат созданных пользователем
   */
  async getMyRooms(userId: string): Promise<Room[]> {
    return this.roomsRepository.findByHostId(userId);
  }

  /**
   * Обновление комнаты (только для хоста)
   */
  async updateRoom(
    slug: string,
    data: IUpdateRoomData,
    user: IUserPayload
  ): Promise<Room> {
    const room = await this.roomsRepository.findBySlug(slug);
    
    if (!room) {
      throw new NotFoundException('Комната не найдена');
    }

    // Проверка прав: только хост может обновить комнату
    if (room.hostId !== user.id) {
      throw new ForbiddenException('Только хост может обновить настройки комнаты');
    }

    // Хешируем пароль, если он обновляется
    let updateData = { ...data };
    if (data.password !== undefined) {
      if (data.password === null || data.password === '') {
        // Удаляем пароль
        updateData.password = null;
      } else {
        // Обновляем пароль
        updateData.password = await ArgonUtil.hashPassword(data.password);
      }
    }

    return this.roomsRepository.update(room.id, updateData);
  }

  /**
   * Удаление комнаты (только для хоста)
   */
  async deleteRoom(slug: string, user: IUserPayload): Promise<void> {
    const room = await this.roomsRepository.findBySlug(slug);
    
    if (!room) {
      throw new NotFoundException('Комната не найдена');
    }

    // Проверка прав: только хост может удалить комнату
    if (room.hostId !== user.id) {
      throw new ForbiddenException('Только хост может удалить комнату');
    }

    await this.roomsRepository.delete(room.id);
  }
}
