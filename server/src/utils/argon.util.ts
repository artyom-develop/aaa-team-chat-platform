import argon2 from 'argon2';
import { Argon2Config } from '../config/argon2.config.js';

export class ArgonUtil {
  /**
   * Хеширование пароля с использованием Argon2
   */
  static async hashPassword(password: string): Promise<string> {
    return argon2.hash(password, {
      type: argon2.argon2id,
      memoryCost: Argon2Config.MEMORY_COST,
      timeCost: Argon2Config.TIME_COST,
      parallelism: Argon2Config.PARALLELISM,
    });
  }

  /**
   * Проверка пароля
   */
  static async verifyPassword(hash: string, password: string): Promise<boolean> {
    try {
      return await argon2.verify(hash, password);
    } catch (error) {
      return false;
    }
  }
}
