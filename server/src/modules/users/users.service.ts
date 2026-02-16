import { User } from '../../generated/prisma/index.js';
import { UsersRepository } from './users.repository.js';
import { IUpdateUserData } from './interfaces/user.interfaces.js';
import {
  NotFoundException,
  BadRequestException,
} from '../../shared/exceptions/index.js';
import { ErrorMessages } from '../../shared/constants/errors.constants.js';

export class UsersService {
  constructor(private readonly usersRepository: UsersRepository) {}

  /**
   * Получение профиля текущего пользователя
   */
  async getMe(userId: string): Promise<User> {
    const user = await this.usersRepository.findById(userId);
    
    if (!user) {
      throw new NotFoundException(ErrorMessages.USER_NOT_FOUND);
    }

    return user;
  }

  /**
   * Обновление профиля текущего пользователя
   */
  async updateMe(
    userId: string,
    data: IUpdateUserData
  ): Promise<User> {
    // Проверка существования пользователя
    const user = await this.usersRepository.findById(userId);
    if (!user) {
      throw new NotFoundException(ErrorMessages.USER_NOT_FOUND);
    }

    // Если обновляется email, проверить уникальность
    if (data.email && data.email !== user.email) {
      const existingUser = await this.usersRepository.findByEmail(data.email);
      if (existingUser) {
        throw new BadRequestException(ErrorMessages.EMAIL_ALREADY_EXISTS);
      }
    }

    return this.usersRepository.update(userId, data);
  }
}
