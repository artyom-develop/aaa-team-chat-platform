import { BaseException } from './BaseException.js';

export class UnauthorizedException extends BaseException {
  constructor(message = 'Unauthorized', details?: unknown) {
    super(401, message, details);
  }
}
