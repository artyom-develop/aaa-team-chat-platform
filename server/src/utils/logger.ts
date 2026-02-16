import winston from 'winston';

const { combine, timestamp, printf, colorize, errors } = winston.format;

// Кастомный формат логов
const customFormat = printf(({ level, message, timestamp, stack }) => {
  if (stack) {
    return `${timestamp} [${level}]: ${message}\n${stack}`;
  }
  return `${timestamp} [${level}]: ${message}`;
});

// Создание logger instance
export const logger = winston.createLogger({
  level: process.env.NODE_ENV === 'development' ? 'debug' : 'info',
  format: combine(
    errors({ stack: true }),
    timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
    customFormat
  ),
  transports: [
    // Console transport
    new winston.transports.Console({
      format: combine(
        colorize(),
        timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
        customFormat
      ),
    }),
    // File transport для ошибок
    new winston.transports.File({
      filename: 'logs/error.log',
      level: 'error',
    }),
    // File transport для всех логов
    new winston.transports.File({
      filename: 'logs/combined.log',
    }),
  ],
});

// Экспорт по умолчанию
export default logger;
