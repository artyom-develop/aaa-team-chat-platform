import 'reflect-metadata';
import http, { Server as HttpServer } from 'http';
import { App } from './app.js';
import { Database } from './database/prisma.client.js';
import { connectRedis, disconnectRedis } from './config/redis.config.js';
import { AppConfig } from './config/app.config.js';
import { DatabaseConfig } from './config/database.config.js';
import { JwtConfig } from './config/jwt.config.js';
import { initializeSocketIO } from './socket/index.js';
import { logger } from './utils/logger.js';

class Server {
  private app: App;

  constructor() {
    this.app = new App();
  }

  /**
   * Запуск сервера
   */
  async start(): Promise<void> {
    try {
      // Валидация конфигурации
      DatabaseConfig.validateConfig();
      JwtConfig.validateConfig();

      // Подключение к базе данных
      await Database.connect();

      // Health check базы данных
      const isDbHealthy = await Database.healthCheck();
      if (!isDbHealthy) {
        throw new Error('Database health check failed');
      }

      // Подключение к Redis
      await connectRedis();

      // Создание HTTP сервера
      const httpServer = http.createServer(this.app.getApp());

      // Инициализация Socket.io
      const io = initializeSocketIO(httpServer);
      logger.info('🔌 Socket.IO initialized');

      // Запуск HTTP сервера
      httpServer.listen(AppConfig.PORT, () => {
        logger.info(`🚀 Server started on port ${AppConfig.PORT}`);
        logger.info(`📝 Environment: ${AppConfig.NODE_ENV}`);
        logger.info(`🗄️  Database: Connected`);
        logger.info(`🔴 Redis: Connected`);
        logger.info(`⚡ Server is ready to accept connections`);
      });

      // Graceful shutdown
      this.setupGracefulShutdown(httpServer);
    } catch (error) {
      logger.error('Failed to start server:', error);
      process.exit(1);
    }
  }

  /**
   * Настройка graceful shutdown
   */
  private setupGracefulShutdown(server: HttpServer): void {
    const shutdown = async (signal: string) => {
      logger.info(`${signal} signal received: closing HTTP server`);

      server.close(async () => {
        logger.info('HTTP server closed');

        try {
          await disconnectRedis();
          logger.info('Redis connection closed');
          
          await Database.disconnect();
          logger.info('Database connection closed');
          
          process.exit(0);
        } catch (error) {
          logger.error('Error during shutdown:', error);
          process.exit(1);
        }
      });

      // Force close after 10 seconds
      setTimeout(() => {
        logger.error('Forcefully shutting down');
        process.exit(1);
      }, 10000);
    };

    process.on('SIGTERM', () => shutdown('SIGTERM'));
    process.on('SIGINT', () => shutdown('SIGINT'));

    // Обработка необработанных ошибок
    process.on('unhandledRejection', (reason, promise) => {
      logger.error('Unhandled Rejection at:', promise, 'reason:', reason);
    });

    process.on('uncaughtException', (error) => {
      logger.error('Uncaught Exception:', error);
      process.exit(1);
    });
  }
}

// Запуск сервера
const server = new Server();
server.start();