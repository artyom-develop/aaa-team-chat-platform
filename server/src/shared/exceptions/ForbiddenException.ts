import { BaseException } from './BaseException.js';

export class ForbiddenException extends BaseException {
  constructor(message = 'Forbidden', details?: unknown) {
    super(403, message, details);
  }
}
