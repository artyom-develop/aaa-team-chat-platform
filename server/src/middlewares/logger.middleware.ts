import morgan from 'morgan';
import { logger } from '../utils/logger.js';

/**
 * HTTP request logger middleware используя morgan и winston
 */
export const httpLogger = morgan(
  ':method :url :status :res[content-length] - :response-time ms',
  {
    stream: {
      write: (message: string) => {
        logger.http(message.trim());
      },
    },
  }
);
