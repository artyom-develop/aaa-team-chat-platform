import { BaseException } from './BaseException.js';

export class NotFoundException extends BaseException {
  constructor(message = 'Not Found', details?: unknown) {
    super(404, message, details);
  }
}
