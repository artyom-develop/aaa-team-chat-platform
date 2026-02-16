import { Response } from 'express';
import { IApiResponse, IPaginatedResponse } from '../shared/interfaces/IResponse.js';

export class ResponseUtil {
  /**
   * Успешный ответ
   */
  static success<T>(res: Response, data: T, message?: string, statusCode = 200): Response {
    const response: IApiResponse<T> = {
      success: true,
      data,
      message,
    };
    return res.status(statusCode).json(response);
  }

  /**
   * Ответ с ошибкой
   */
  static error(res: Response, message: string, statusCode = 500, details?: unknown): Response {
    const response: IApiResponse = {
      success: false,
      message,
      error: {
        name: 'Error',
        message,
        details,
      },
    };
    return res.status(statusCode).json(response);
  }

  /**
   * Пагинированный ответ
   */
  static paginated<T>(
    res: Response,
    data: T[],
    page: number,
    limit: number,
    total: number
  ): Response {
    const response: IPaginatedResponse<T> = {
      success: true,
      data,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    };
    return res.status(200).json(response);
  }

  /**
   * Ответ создания ресурса (201)
   */
  static created<T>(res: Response, data: T, message = 'Resource created'): Response {
    return this.success(res, data, message, 201);
  }

  /**
   * Ответ без содержимого (204)
   */
  static noContent(res: Response): Response {
    return res.status(204).send();
  }

  /**
   * Ответ с ошибкой 400 (Bad Request)
   */
  static badRequest(res: Response, message: string, details?: unknown): Response {
    return this.error(res, message, 400, details);
  }
}
