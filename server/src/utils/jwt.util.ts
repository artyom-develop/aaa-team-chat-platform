import jwt, { type SignOptions, type Secret } from 'jsonwebtoken';
import { JwtConfig } from '../config/jwt.config.js';
import { IUserPayload } from '../shared/types/express.types.js';

export class JwtUtil {
  /**
   * Генерация Access токена
   */
  static generateToken(payload: IUserPayload): string {
    return jwt.sign(
      payload,
      JwtConfig.SECRET as Secret,
      {
        expiresIn: JwtConfig.EXPIRES_IN,
      } as SignOptions
    );
  }

  /**
   * Генерация Refresh токена
   */
  static generateRefreshToken(payload: IUserPayload): string {
    return jwt.sign(
      payload,
      JwtConfig.SECRET as Secret,
      {
        expiresIn: JwtConfig.REFRESH_EXPIRES_IN,
      } as SignOptions
    );
  }

  /**
   * Генерация пары токенов (access + refresh)
   */
  static generateTokenPair(payload: IUserPayload): { accessToken: string; refreshToken: string } {
    return {
      accessToken: this.generateToken(payload),
      refreshToken: this.generateRefreshToken(payload),
    };
  }

  /**
   * Верификация JWT токена
   */
  static verifyToken(token: string): IUserPayload {
    return jwt.verify(token, JwtConfig.SECRET) as IUserPayload;
  }

  /**
   * Декодирование токена без верификации
   */
  static decodeToken(token: string): IUserPayload | null {
    const decoded = jwt.decode(token);
    return decoded as IUserPayload | null;
  }

  /**
   * Получить время жизни токена в секундах
   */
  static getTokenExpiration(token: string): number | null {
    const decoded = jwt.decode(token) as any;
    if (decoded && decoded.exp) {
      const now = Math.floor(Date.now() / 1000);
      return decoded.exp - now;
    }
    return null;
  }
}
