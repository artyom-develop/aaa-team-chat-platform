import { createClient } from 'redis';
import { logger } from '../utils/logger.js';

// Создаем конфигурацию Redis с опциональным паролем
const redisConfig: any = {
  socket: {
    host: process.env.REDIS_HOST || 'localhost',
    port: parseInt(process.env.REDIS_PORT || '6379'),
  },
};

// Добавляем пароль только если он указан
if (process.env.REDIS_PASSWORD) {
  redisConfig.password = process.env.REDIS_PASSWORD;
  logger.info('Redis: Using password authentication');
} else {
  logger.info('Redis: No password configured (auth disabled)');
}

const redisClient = createClient(redisConfig);

redisClient.on('error', (err) => logger.error('Redis Client Error:', err));
redisClient.on('connect', () => logger.info('Redis connected successfully'));
redisClient.on('ready', () => logger.info('Redis ready to accept commands'));

export async function connectRedis() {
  try {
    await redisClient.connect();
    logger.info('Redis connection initialized');
  } catch (error) {
    logger.error('Failed to connect to Redis:', error);
    throw error;
  }
}

export async function disconnectRedis() {
  try {
    await redisClient.quit();
    logger.info('Redis disconnected');
  } catch (error) {
    logger.error('Error disconnecting Redis:', error);
  }
}

export { redisClient };
