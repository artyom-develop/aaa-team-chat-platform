import { Server as HttpServer } from 'http';
import { Server, ServerOptions } from 'socket.io';
import { socketAuthMiddleware } from './middleware.js';
import { RoomHandler } from './handlers/room.handler.js';
import { WebRTCHandler } from './handlers/webrtc.handler.js';
import { ChatHandler } from './handlers/chat.handler.js';
import { MediaControlHandler } from './handlers/media.handler.js';
import { HostHandler } from './handlers/host.handler.js';
import { AuthenticatedSocket, ClientToServerEvents, ServerToClientEvents } from './types.js';
import { logger } from '../utils/logger.js';
import { AppConfig } from '../config/app.config.js';

/**
 * Инициализация Socket.io сервера
 */
export const initializeSocketIO = (httpServer: HttpServer): Server => {
  const socketOptions: Partial<ServerOptions> = {
    cors: {
      origin: (origin, callback) => {
        // Разрешаем запросы без origin
        if (!origin) return callback(null, true);

        // Список разрешенных origins
        const allowedOrigins = [
          // Local development
          'http://localhost:3000',
          'http://localhost:5173',
          'http://localhost:5174',
          'http://localhost:5175',
        ];

        // Проверяем точное совпадение
        if (allowedOrigins.includes(origin)) {
          return callback(null, true);
        }

        // Разрешаем все Vercel preview и production deployments
        if (origin.endsWith('.vercel.app')) {
          return callback(null, true);
        }

        // Запрещаем все остальные
        callback(new Error('Not allowed by CORS'));
      },
      methods: ['GET', 'POST'],
      credentials: true,
    },
    transports: ['websocket', 'polling'],
  };

  const io = new Server<ClientToServerEvents, ServerToClientEvents>(httpServer, socketOptions);

  // Применяем middleware аутентификации
  io.use(socketAuthMiddleware);

  // Создаём обработчики
  const roomHandler = new RoomHandler(io);
  const webrtcHandler = new WebRTCHandler(io);
  const chatHandler = new ChatHandler(io);
  const mediaControlHandler = new MediaControlHandler(io);
  const hostHandler = new HostHandler(io);

  // Обработка подключений
  io.on('connection', (socket: AuthenticatedSocket) => {
    logger.info(`New socket connection: socketId=${socket.id}, userId=${socket.userId}`);

    // События комнаты
    socket.on('room:join', (data, callback) => roomHandler.handleJoin(socket, data, callback));
    socket.on('room:leave', (data) => roomHandler.handleLeave(socket, data));

    // События WebRTC
    socket.on('webrtc:offer', (data) => webrtcHandler.handleOffer(socket, data));
    socket.on('webrtc:answer', (data) => webrtcHandler.handleAnswer(socket, data));
    socket.on('webrtc:ice-candidate', (data) => webrtcHandler.handleIceCandidate(socket, data));

    // События чата
    socket.on('chat:send', (data, callback) => chatHandler.handleSendMessage(socket, data, callback));

    // События управления медиа
    socket.on('media:toggle-mute', (data) => mediaControlHandler.handleToggleMute(socket, data));
    socket.on('media:toggle-camera', (data) => mediaControlHandler.handleToggleCamera(socket, data));
    socket.on('media:toggle-screen', (data) => mediaControlHandler.handleToggleScreen(socket, data));

    // События хоста
    socket.on('host:kick-user', (data) => hostHandler.handleKickUser(socket, data));
    socket.on('host:transfer-host', (data) => hostHandler.handleTransferHost(socket, data));

    // Отключение
    socket.on('disconnect', () => roomHandler.handleDisconnect(socket));
  });

  logger.info('Socket.IO initialized');

  return io;
};
