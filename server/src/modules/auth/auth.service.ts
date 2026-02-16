import { User } from '../../generated/prisma/index.js';
import { UsersRepository } from '../users/users.repository.js';
import { ArgonUtil } from '../../utils/argon.util.js';
import { JwtUtil } from '../../utils/jwt.util.js';
import { JwtConfig } from '../../config/jwt.config.js';
import { TokenBlacklistService } from '../../services/token-blacklist.service.js';
import { BadRequestException, UnauthorizedException } from '../../shared/exceptions/index.js';
import { ErrorMessages } from '../../shared/constants/errors.constants.js';
import { IRegisterData, ILoginCredentials, IAuthTokens } from '../../shared/types/auth.types.js';
import { IUserPayload } from '../../shared/types/express.types.js';
import { v4 as uuidv4 } from 'uuid';

export class AuthService {
  constructor(private readonly usersRepository: UsersRepository) {}

  /**
   * Регистрация нового пользователя
   */
  async register(data: IRegisterData): Promise<{ user: User; tokens: IAuthTokens }> {
    // Проверка существования пользователя
    const existingUser = await this.usersRepository.findByEmail(data.email);
    if (existingUser) {
      throw new BadRequestException(ErrorMessages.EMAIL_ALREADY_EXISTS);
    }

    // Хеширование пароля
    const hashedPassword = await ArgonUtil.hashPassword(data.password);

    // Создание пользователя
    const user = await this.usersRepository.create({
      ...data,
      password: hashedPassword,
    });

    // Генерация токенов (tokenVersion = 0 по умолчанию)
    const tokens = this.generateTokens(user);

    // Сохраняем refresh token в Redis
    await TokenBlacklistService.saveRefreshToken(
      user.id,
      tokens.refreshToken,
      JwtConfig.getRefreshTokenExpiresInSeconds()
    );

    return {
      user,
      tokens,
    };
  }

  /**
   * Авторизация пользователя
   */
  async login(credentials: ILoginCredentials): Promise<{ user: User; tokens: IAuthTokens }> {
    // Поиск пользователя по email
    const user = await this.usersRepository.findByEmail(credentials.email);
    
    if (!user) {
      throw new UnauthorizedException(ErrorMessages.INVALID_CREDENTIALS);
    }

    // Проверка активности пользователя
    if (!user.isActive) {
      throw new UnauthorizedException('Аккаунт заблокирован');
    }

    // Гостевые пользователи не могут входить по паролю
    if (user.isGuest || !user.password) {
      throw new UnauthorizedException('Гостевой аккаунт не может использовать обычную авторизацию');
    }

    // Проверка пароля
    const isPasswordValid = await ArgonUtil.verifyPassword(user.password, credentials.password);
    
    if (!isPasswordValid) {
      throw new UnauthorizedException(ErrorMessages.INVALID_CREDENTIALS);
    }

    // Инвалидация старых токенов путем инкремента версии
    const updatedUser = await this.usersRepository.update(user.id, {
      tokenVersion: user.tokenVersion + 1,
    });

    // Генерация токенов
    const tokens = this.generateTokens(updatedUser);

    // Сохраняем refresh token в Redis
    await TokenBlacklistService.saveRefreshToken(
      updatedUser.id,
      tokens.refreshToken,
      JwtConfig.getRefreshTokenExpiresInSeconds()
    );

    return {
      user: updatedUser,
      tokens,
    };
  }

  /**
   * Выход из системы (logout)
   */
  async logout(userId: string, accessToken: string): Promise<void> {
    // Добавляем access token в blacklist
    const expiresIn = JwtUtil.getTokenExpiration(accessToken) || JwtConfig.getAccessTokenExpiresInSeconds();
    await TokenBlacklistService.blacklistToken(accessToken, expiresIn);

    // Удаляем refresh token из Redis
    await TokenBlacklistService.deleteRefreshToken(userId);
  }

  /**
   * Гостевой вход (без регистрации)
   */
  async guestLogin(displayName: string): Promise<{ user: User; tokens: IAuthTokens }> {
    // Генерируем уникальный email для гостя
    const guestEmail = `guest-${uuidv4()}@videomeet.local`;

    // Создаем гостевого пользователя
    const guestUser = await this.usersRepository.create({
      email: guestEmail,
      displayName,
      password: null, // Гости не имеют пароля
      isGuest: true,
    });

    // Генерация токенов
    const tokens = this.generateTokens(guestUser);

    // Сохраняем refresh token в Redis
    await TokenBlacklistService.saveRefreshToken(
      guestUser.id,
      tokens.refreshToken,
      JwtConfig.getRefreshTokenExpiresInSeconds()
    );

    return {
      user: guestUser,
      tokens,
    };
  }

  /**
   * Обновление токена (refresh)
   */
  async refreshToken(refreshToken: string, oldAccessToken?: string): Promise<IAuthTokens> {
    // Верифицируем refresh token
    let payload: IUserPayload;
    try {
      payload = JwtUtil.verifyToken(refreshToken);
    } catch (error) {
      throw new UnauthorizedException('Invalid refresh token');
    }

    // Проверяем, что токен не в blacklist
    const isBlacklisted = await TokenBlacklistService.isBlacklisted(refreshToken);
    if (isBlacklisted) {
      throw new UnauthorizedException('Refresh token has been revoked');
    }

    // Проверяем, что refresh token существует в Redis
    const storedToken = await TokenBlacklistService.getRefreshToken(payload.id);
    if (!storedToken || storedToken !== refreshToken) {
      throw new UnauthorizedException('Refresh token not found or invalid');
    }

    // Получаем пользователя
    const user = await this.usersRepository.findById(payload.id);
    if (!user || !user.isActive) {
      throw new UnauthorizedException('User not found or inactive');
    }

    // Проверяем версию токена
    if (user.tokenVersion !== payload.tokenVersion) {
      throw new UnauthorizedException('Token version mismatch');
    }

    // ВАЖНО: Увеличиваем tokenVersion - это инвалидирует ВСЕ старые токены
    const updatedUser = await this.usersRepository.update(user.id, {
      tokenVersion: user.tokenVersion + 1,
    });

    // Добавляем старый access token в blacklist (если предоставлен)
    if (oldAccessToken) {
      const accessTokenExpiration = JwtUtil.getTokenExpiration(oldAccessToken) || JwtConfig.getAccessTokenExpiresInSeconds();
      await TokenBlacklistService.blacklistToken(oldAccessToken, accessTokenExpiration);
    }

    // Добавляем старый refresh token в blacklist
    const oldTokenExpiration = JwtUtil.getTokenExpiration(refreshToken) || JwtConfig.getRefreshTokenExpiresInSeconds();
    await TokenBlacklistService.blacklistToken(refreshToken, oldTokenExpiration);

    // Генерируем новую пару токенов с НОВОЙ версией
    const tokens = this.generateTokens(updatedUser);

    // Сохраняем новый refresh token
    await TokenBlacklistService.saveRefreshToken(
      updatedUser.id,
      tokens.refreshToken,
      JwtConfig.getRefreshTokenExpiresInSeconds()
    );

    return tokens;
  }

  /**
   * Генерация JWT токенов
   */
  private generateTokens(user: User): IAuthTokens {
    const payload: IUserPayload = {
      id: user.id,
      email: user.email,
      role: user.role,
      tokenVersion: user.tokenVersion,
    };

    const { accessToken, refreshToken } = JwtUtil.generateTokenPair(payload);

    return {
      accessToken,
      refreshToken,
    };
  }
}
