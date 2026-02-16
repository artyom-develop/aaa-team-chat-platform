import { redisClient } from '../config/redis.config.js';
import { logger } from '../utils/logger.js';

export class TokenBlacklistService {
  private static readonly BLACKLIST_PREFIX = 'blacklist:token:';
  private static readonly REFRESH_PREFIX = 'refresh:token:';

  /**
   * Добавить токен в черный список
   */
  static async blacklistToken(token: string, expiresIn: number): Promise<void> {
    try {
      const key = this.BLACKLIST_PREFIX + token;
      // Сохраняем токен на время его жизни
      await redisClient.setEx(key, expiresIn, 'blacklisted');
      logger.debug(`Token added to blacklist: ${token.substring(0, 20)}...`);
    } catch (error) {
      logger.error('Error blacklisting token:', error);
      throw error;
    }
  }

  /**
   * Проверить, находится ли токен в черном списке
   */
  static async isBlacklisted(token: string): Promise<boolean> {
    try {
      const key = this.BLACKLIST_PREFIX + token;
      const result = await redisClient.get(key);
      return result !== null;
    } catch (error) {
      logger.error('Error checking token blacklist:', error);
      return false; // В случае ошибки Redis разрешаем доступ
    }
  }

  /**
   * Сохранить refresh token
   */
  static async saveRefreshToken(userId: string, token: string, expiresIn: number): Promise<void> {
    try {
      const key = this.REFRESH_PREFIX + userId;
      await redisClient.setEx(key, expiresIn, token);
      logger.debug(`Refresh token saved for user: ${userId}`);
    } catch (error) {
      logger.error('Error saving refresh token:', error);
      throw error;
    }
  }

  /**
   * Получить refresh token пользователя
   */
  static async getRefreshToken(userId: string): Promise<string | null> {
    try {
      const key = this.REFRESH_PREFIX + userId;
      return await redisClient.get(key);
    } catch (error) {
      logger.error('Error getting refresh token:', error);
      return null;
    }
  }

  /**
   * Удалить refresh token (при logout)
   */
  static async deleteRefreshToken(userId: string): Promise<void> {
    try {
      const key = this.REFRESH_PREFIX + userId;
      await redisClient.del(key);
      logger.debug(`Refresh token deleted for user: ${userId}`);
    } catch (error) {
      logger.error('Error deleting refresh token:', error);
      throw error;
    }
  }

  /**
   * Удалить все refresh токены пользователя
   */
  static async revokeAllUserTokens(userId: string): Promise<void> {
    try {
      await this.deleteRefreshToken(userId);
      logger.info(`All tokens revoked for user: ${userId}`);
    } catch (error) {
      logger.error('Error revoking user tokens:', error);
      throw error;
    }
  }
}
