import { Router, RequestHandler } from 'express';
import { ChatController } from './chat.controller.js';
import { ChatService } from './chat.service.js';
import { ChatRepository } from './chat.repository.js';
import { RoomsRepository } from '../rooms/rooms.repository.js';
import { authenticate } from '../../middlewares/passport.middleware.js';

// Dependency Injection
const chatRepository = new ChatRepository();
const roomsRepository = new RoomsRepository();
const chatService = new ChatService(chatRepository, roomsRepository);
const chatController = new ChatController(chatService);

const router = Router();

/**
 * @swagger
 * /chat/{roomSlug}/messages:
 *   get:
 *     tags: [Чат]
 *     summary: Получение истории сообщений комнаты
 *     description: Получение истории чат-сообщений с пагинацией
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: roomSlug
 *         required: true
 *         schema:
 *           type: string
 *           example: abc1-def2-gh34
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *           default: 1
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           default: 50
 *           maximum: 100
 *     responses:
 *       200:
 *         description: История сообщений
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 data:
 *                   type: array
 *                   items:
 *                     $ref: '#/components/schemas/MessageResponse'
 *                 pagination:
 *                   type: object
 *                   properties:
 *                     page:
 *                       type: integer
 *                     limit:
 *                       type: integer
 *                     total:
 *                       type: integer
 *       401:
 *         description: Требуется авторизация
 *       404:
 *         description: Комната не найдена
 */
router.get('/:roomSlug/messages', authenticate, chatController.getMessages as RequestHandler);

export { router as chatRouter };
