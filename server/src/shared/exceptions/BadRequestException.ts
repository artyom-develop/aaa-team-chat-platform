import { BaseException } from './BaseException.js';

export class BadRequestException extends BaseException {
  constructor(message = 'Bad Request', details?: unknown) {
    super(400, message, details);
  }
}
