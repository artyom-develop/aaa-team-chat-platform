import { User, Role } from '../../generated/prisma/index.js';
import { prisma } from '../../database/prisma.client.js';
import { IUsersRepository, ICreateUserData, IUpdateUserData } from './interfaces/user.interfaces.js';

export class UsersRepository implements IUsersRepository {
  /**
   * Поиск пользователя по ID
   */
  async findById(id: string): Promise<User | null> {
    return prisma.user.findUnique({
      where: { id },
    });
  }

  /**
   * Поиск пользователя по email
   */
  async findByEmail(email: string): Promise<User | null> {
    return prisma.user.findUnique({
      where: { email },
    });
  }

  /**
   * Получение всех пользователей с пагинацией
   */
  async findAll(skip = 0, take = 10): Promise<User[]> {
    return prisma.user.findMany({
      skip,
      take,
      orderBy: { createdAt: 'desc' },
    });
  }

  /**
   * Подсчет общего количества пользователей
   */
  async count(): Promise<number> {
    return prisma.user.count();
  }

  /**
   * Создание нового пользователя
   */
  async create(data: ICreateUserData): Promise<User> {
    return prisma.user.create({
      data: {
        displayName: data.displayName,
        email: data.email,
        password: data.password,
        avatarUrl: data.avatarUrl || null,
        role: data.role || Role.USER,
        isGuest: data.isGuest || false,
      },
    });
  }

  /**
   * Обновление данных пользователя
   */
  async update(id: string, data: IUpdateUserData): Promise<User> {
    return prisma.user.update({
      where: { id },
      data,
    });
  }

  /**
   * Обновление статуса активности пользователя
   */
  async updateActiveStatus(id: string, isActive: boolean): Promise<User> {
    return prisma.user.update({
      where: { id },
      data: { isActive },
    });
  }

  /**
   * Удаление пользователя
   */
  async delete(id: string): Promise<void> {
    await prisma.user.delete({
      where: { id },
    });
  }
}
