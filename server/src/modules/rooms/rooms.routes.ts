import { Router, RequestHandler } from 'express';
import { RoomsController } from './rooms.controller.js';
import { RoomsService } from './rooms.service.js';
import { RoomsRepository } from './rooms.repository.js';
import { validateDto } from '../../middlewares/validation.middleware.js';
import { authenticate } from '../../middlewares/passport.middleware.js';
import { CreateRoomDto } from './dto/create-room.dto.js';
import { JoinRoomDto } from './dto/join-room.dto.js';

// Dependency Injection
const roomsRepository = new RoomsRepository();
const roomsService = new RoomsService(roomsRepository);
const roomsController = new RoomsController(roomsService);

const router = Router();

/**
 * @swagger
 * /rooms:
 *   post:
 *     tags: [Комнаты]
 *     summary: Создание новой комнаты
 *     description: Создание новой видеокомнаты с уникальным slug
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [name]
 *             properties:
 *               name:
 *                 type: string
 *                 minLength: 3
 *                 maxLength: 100
 *                 example: Встреча с командой
 *               password:
 *                 type: string
 *                 minLength: 4
 *                 maxLength: 50
 *                 example: secret123
 *               hasLobby:
 *                 type: boolean
 *                 default: false
 *                 example: true
 *               maxParticipants:
 *                 type: integer
 *                 minimum: 2
 *                 maximum: 50
 *                 default: 50
 *                 example: 10
 *           example:
 *             name: Встреча с командой
 *             password: secret123
 *             hasLobby: true
 *             maxParticipants: 10
 *     responses:
 *       201:
 *         description: Комната успешно создана
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/RoomResponse'
 *       400:
 *         description: Ошибка валидации
 *       401:
 *         description: Требуется авторизация
 */
router.post('/', authenticate, validateDto(CreateRoomDto), roomsController.create as RequestHandler);

/**
 * @swagger
 * /rooms/ice-servers:
 *   get:
 *     tags: [Комнаты]
 *     summary: Получение ICE серверов для WebRTC
 *     description: Получение конфигурации STUN/TURN серверов
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: ICE серверы успешно получены
 */
router.get('/ice-servers', authenticate, roomsController.getIceServers as RequestHandler);

/**
 * @swagger
 * /rooms/my:
 *   get:
 *     tags: [Комнаты]
 *     summary: Получение моих комнат
 *     description: Получение списка комнат, созданных текущим пользователем
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Список комнат пользователя
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 $ref: '#/components/schemas/RoomResponse'
 *       401:
 *         description: Требуется авторизация
 */
router.get('/my', authenticate, roomsController.getMy as RequestHandler);

/**
 * @swagger
 * /rooms/{slug}:
 *   get:
 *     tags: [Комнаты]
 *     summary: Получение информации о комнате
 *     description: Получение данных о комнате по её уникальному slug
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: slug
 *         required: true
 *         schema:
 *           type: string
 *           example: abc1-def2-gh34
 *     responses:
 *       200:
 *         description: Данные комнаты
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/RoomResponse'
 *       401:
 *         description: Требуется авторизация
 *       404:
 *         description: Комната не найдена
 */
router.get('/:slug', authenticate, roomsController.getBySlug as RequestHandler);

/**
 * @swagger
 * /rooms/{slug}/join:
 *   post:
 *     tags: [Комнаты]
 *     summary: Присоединение к комнате
 *     description: Проверка пароля и присоединение к комнате
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: slug
 *         required: true
 *         schema:
 *           type: string
 *           example: abc1-def2-gh34
 *     requestBody:
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               password:
 *                 type: string
 *                 example: secret123
 *           example:
 *             password: secret123
 *     responses:
 *       200:
 *         description: Успешное подключение к комнате
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/RoomResponse'
 *       401:
 *         description: Неверный пароль или требуется авторизация
 *       404:
 *         description: Комната не найдена
 */
router.post('/:slug/join', authenticate, validateDto(JoinRoomDto), roomsController.join as RequestHandler);

/**
 * @swagger
 * /rooms/{slug}:
 *   delete:
 *     tags: [Комнаты]
 *     summary: Удаление комнаты
 *     description: Удаление комнаты (только для хоста)
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: slug
 *         required: true
 *         schema:
 *           type: string
 *           example: abc1-def2-gh34
 *     responses:
 *       200:
 *         description: Комната успешно удалена
 *       401:
 *         description: Требуется авторизация
 *       403:
 *         description: Только хост может удалить комнату
 *       404:
 *         description: Комната не найдена
 */
router.delete('/:slug', authenticate, roomsController.delete as RequestHandler);

export { router as roomsRouter };
