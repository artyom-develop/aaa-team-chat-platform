import { Request, Response, NextFunction } from 'express';
import { validate, ValidationError } from 'class-validator';
import { plainToClass } from 'class-transformer';
import { BadRequestException } from '../shared/exceptions/index.js';
import { ErrorMessages } from '../shared/constants/errors.constants.js';

/**
 * Type для конструктора класса DTO
 */
type ClassConstructor<T = object> = new (...args: unknown[]) => T;

/**
 * Middleware для валидации DTO с использованием class-validator
 */
export const validateDto = <T extends object>(dtoClass: ClassConstructor<T>) => {
  return async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      // Преобразование plain object в class instance
      const dtoInstance = plainToClass(dtoClass, req.body);

      // Валидация
      const errors: ValidationError[] = await validate(dtoInstance as object);

      if (errors.length > 0) {
        // Форматирование ошибок валидации
        const formattedErrors = errors.map((error) => ({
          field: error.property,
          constraints: error.constraints,
        }));

        throw new BadRequestException(ErrorMessages.VALIDATION_ERROR, formattedErrors);
      }

      // Заменяем body на валидированный instance
      req.body = dtoInstance;
      next();
    } catch (error) {
      next(error);
    }
  };
};

// Alias for compatibility
export const validateRequest = validateDto;
