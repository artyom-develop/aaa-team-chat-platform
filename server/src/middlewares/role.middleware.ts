import { Response, NextFunction } from 'express';
import { IAuthenticatedRequest } from '../shared/types/express.types.js';
import { ForbiddenException } from '../shared/exceptions/index.js';
import { ErrorMessages } from '../shared/constants/errors.constants.js';
import { Role } from '../generated/prisma/index.js';

/**
 * Middleware для проверки роли пользователя
 */
export const requireRole = (allowedRoles: Role[]) => {
  return (req: IAuthenticatedRequest, res: Response, next: NextFunction): void => {
    if (!req.user) {
      throw new ForbiddenException(ErrorMessages.UNAUTHORIZED);
    }

    if (!allowedRoles.includes(req.user.role)) {
      throw new ForbiddenException(ErrorMessages.FORBIDDEN);
    }

    next();
  };
};

/**
 * Middleware только для админов
 */
export const requireAdmin = requireRole([Role.ADMIN]);

/**
 * Middleware для всех аутентифицированных пользователей
 */
export const requireAuth = requireRole([Role.ADMIN, Role.USER]);
