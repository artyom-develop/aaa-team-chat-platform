import { Strategy as JwtStrategy, ExtractJwt, StrategyOptions,VerifiedCallback } from 'passport-jwt';
import { JwtConfig } from '../../../config/jwt.config.js';
import { UsersRepository } from '../../users/users.repository.js';
import { IUserPayload } from '../../../shared/types/express.types.js';
import { TokenBlacklistService } from '../../../services/token-blacklist.service.js';
import { Request } from 'express';

export class PassportJwtStrategy {
  constructor(private readonly usersRepository: UsersRepository) {}

  getStrategy(): JwtStrategy {
    const options: StrategyOptions = {
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      secretOrKey: JwtConfig.SECRET,
      passReqToCallback: true, // Передаем request для получения токена
    };

    return new JwtStrategy(options, async (req: Request, payload: IUserPayload, done: VerifiedCallback) => {
      try {
        // Извлекаем токен из заголовка
        const token = ExtractJwt.fromAuthHeaderAsBearerToken()(req);
        
        if (!token) {
          return done(null, false);
        }

        // Проверяем, находится ли токен в черном списке
        const isBlacklisted = await TokenBlacklistService.isBlacklisted(token);
        if (isBlacklisted) {
          return done(null, false);
        }

        const user = await this.usersRepository.findById(payload.id);

        if (!user) {
          return done(null, false);
        }

        // Проверка активности пользователя
        if (!user.isActive) {
          return done(null, false);
        }

        // Проверка версии токена - если версии не совпадают, токен недействителен
        if (user.tokenVersion !== payload.tokenVersion) {
          return done(null, false);
        }

        // Передаем payload в req.user
        const userPayload: IUserPayload = {
          id: user.id,
          email: user.email,
          role: user.role,
          tokenVersion: user.tokenVersion,
        };

        return done(null, userPayload);
      } catch (error) {
        return done(error, false);
      }
    });
  }
}
