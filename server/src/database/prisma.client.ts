import { PrismaClient } from '../generated/prisma/index.js';
import { PrismaPg } from '@prisma/adapter-pg';
import { Pool } from 'pg';
import { logger } from '../utils/logger.js';

export class Database {
  private static instance: PrismaClient;
  private static pool: Pool;

  private constructor() {}

  /**
   * Получение singleton экземпляра Prisma Client
   */
  static getInstance(): PrismaClient {
    if (!Database.instance) {
      // Создаем connection pool для PostgreSQL
      Database.pool = new Pool({
        connectionString: process.env.DATABASE_URL,
      });

      // Создаем adapter
      const adapter = new PrismaPg(Database.pool);

      Database.instance = new PrismaClient({
        adapter,
        log: [
          { level: 'query', emit: 'event' },
          { level: 'error', emit: 'event' },
          { level: 'warn', emit: 'event' },
        ],
      });

      // Логирование запросов в development
      if (process.env.NODE_ENV === 'development') {
        Database.instance.$on('query' as never, (e: { query: string; duration: number }) => {
          logger.debug(`Query: ${e.query}`);
          logger.debug(`Duration: ${e.duration}ms`);
        });
      }

      Database.instance.$on('error' as never, (e: Error) => {
        logger.error('Prisma Error:', e);
      });

      Database.instance.$on('warn' as never, (e: { message: string }) => {
        logger.warn('Prisma Warning:', e);
      });

      logger.info('Database connection initialized');
    }

    return Database.instance;
  }

  /**
   * Подключение к базе данных
   */
  static async connect(): Promise<void> {
    try {
      const prisma = Database.getInstance();
      await prisma.$connect();
      logger.info('Database connected successfully');
    } catch (error) {
      logger.error('Failed to connect to database:', error);
      throw error;
    }
  }

  /**
   * Отключение от базы данных
   */
  static async disconnect(): Promise<void> {
    try {
      if (Database.instance) {
        await Database.instance.$disconnect();
        if (Database.pool) {
          await Database.pool.end();
        }
        logger.info('Database disconnected successfully');
      }
    } catch (error) {
      logger.error('Error disconnecting from database:', error);
      throw error;
    }
  }

  /**
   * Проверка соединения с базой данных
   */
  static async healthCheck(): Promise<boolean> {
    try {
      const prisma = Database.getInstance();
      await prisma.$queryRaw`SELECT 1`;
      return true;
    } catch (error) {
      logger.error('Database health check failed:', error);
      return false;
    }
  }
}

// Экспорт singleton экземпляра
export const prisma = Database.getInstance();