import { Request, Response, NextFunction } from 'express';
import { BaseException } from '../shared/exceptions/BaseException.js';
import { logger } from '../utils/logger.js';
import { ResponseUtil } from '../utils/response.util.js';
import { ErrorMessages } from '../shared/constants/errors.constants.js';

/**
 * Интерфейс для Prisma ошибок
 */
interface PrismaClientError extends Error {
  code?: string;
  meta?: {
    target?: string[];
    [key: string]: unknown;
  };
  clientVersion?: string;
}

/**
 * Type guard для проверки Prisma ошибки
 */
function isPrismaError(error: Error): error is PrismaClientError {
  return error.name === 'PrismaClientKnownRequestError' && 'code' in error;
}

/**
 * Централизованный обработчик ошибок
 */
export const errorHandler = (
  error: Error,
  req: Request,
  res: Response,
  next: NextFunction
): void => {
  // Логирование ошибки
  logger.error('Error occurred:', {
    name: error.name,
    message: error.message,
    stack: error.stack,
    path: req.path,
    method: req.method,
  });

  // Обработка известных ошибок (BaseException)
  if (error instanceof BaseException) {
    ResponseUtil.error(res, error.message, error.statusCode, error.details);
    return;
  }

  // Обработка ошибок Prisma
  if (isPrismaError(error)) {
    // Уникальное ограничение
    if (error.code === 'P2002') {
      ResponseUtil.error(
        res,
        'Запись с такими данными уже существует',
        409,
        { field: error.meta?.target }
      );
      return;
    }

    // Запись не найдена
    if (error.code === 'P2025') {
      ResponseUtil.error(res, 'Запись не найдена', 404);
      return;
    }
  }

  // Обработка ошибок валидации
  if (error.name === 'ValidationError') {
    ResponseUtil.error(res, ErrorMessages.VALIDATION_ERROR, 400, error.message);
    return;
  }

  // Обработка JWT ошибок
  if (error.name === 'JsonWebTokenError') {
    ResponseUtil.error(res, ErrorMessages.INVALID_TOKEN, 401);
    return;
  }

  if (error.name === 'TokenExpiredError') {
    ResponseUtil.error(res, ErrorMessages.TOKEN_EXPIRED, 401);
    return;
  }

  // Неизвестная ошибка
  const statusCode = process.env.NODE_ENV === 'production' ? 500 : 500;
  const message =
    process.env.NODE_ENV === 'production'
      ? ErrorMessages.INTERNAL_ERROR
      : error.message;

  ResponseUtil.error(res, message, statusCode, {
    stack: process.env.NODE_ENV === 'development' ? error.stack : undefined,
  });
};

/**
 * Обработчик для несуществующих маршрутов
 */
export const notFoundHandler = (req: Request, res: Response): void => {
  ResponseUtil.error(res, `Маршрут ${req.path} не найден`, 404);
};
