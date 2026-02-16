import { createClient } from 'redis';
import { logger } from '../utils/logger.js';

const redisClient = createClient({
  socket: {
    host: process.env.REDIS_HOST || 'localhost',
    port: parseInt(process.env.REDIS_PORT || '6379'),
  },
  password: process.env.REDIS_PASSWORD || 'redis123',
});

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
