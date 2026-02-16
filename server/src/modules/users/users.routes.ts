import { Router, RequestHandler } from 'express';
import { UsersController } from './users.controller.js';
import { UsersService } from './users.service.js';
import { UsersRepository } from './users.repository.js';
import { validateDto } from '../../middlewares/validation.middleware.js';
import { UpdateUserDto } from './dto/update-user.dto.js';

// Dependency Injection
const usersRepository = new UsersRepository();
const usersService = new UsersService(usersRepository);
const usersController = new UsersController(usersService);

const router = Router();

/**
 * @swagger
 * /users/me:
 *   get:
 *     tags: [Пользователи]
 *     summary: Получение собственного профиля
 *     description: Получение данных текущего авторизованного пользователя
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Данные пользователя
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/UserResponse'
 *       401:
 *         description: Требуется авторизация
 *       404:
 *         description: Пользователь не найден
 */
router.get('/me', usersController.getMe as RequestHandler);

/**
 * @swagger
 * /users/me:
 *   patch:
 *     tags: [Пользователи]
 *     summary: Обновление собственного профиля
 *     description: Обновление данных текущего пользователя (displayName, avatarUrl)
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               displayName:
 *                 type: string
 *                 minLength: 2
 *                 maxLength: 50
 *                 example: Иван Иванов
 *               avatarUrl:
 *                 type: string
 *                 format: uri
 *                 example: https://example.com/avatar.jpg
 *           example:
 *             displayName: Иван Петров
 *             avatarUrl: https://i.pravatar.cc/300
 *     responses:
 *       200:
 *         description: Профиль успешно обновлён
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/UserResponse'
 *       400:
 *         description: Ошибка валидации
 *       401:
 *         description: Требуется авторизация
 *       404:
 *         description: Пользователь не найден
 */
router.patch('/me', validateDto(UpdateUserDto), usersController.updateMe as RequestHandler);

export { router as usersRouter };
