import express, { Application } from 'express'
import helmet from 'helmet'
import cors from 'cors'
import cookieParser from 'cookie-parser'
import passport from 'passport'
import rateLimit from 'express-rate-limit'
import swaggerUi from 'swagger-ui-express'
import { swaggerSpec } from './config/swagger.config.js'
import { authRouter } from './modules/auth/auth.routes.js'
import { usersRouter } from './modules/users/users.routes.js'
import { roomsRouter } from './modules/rooms/rooms.routes.js'
import { chatRouter } from './modules/chat/chat.routes.js'
import {
	errorHandler,
	notFoundHandler,
} from './middlewares/error.middleware.js'
import { httpLogger } from './middlewares/logger.middleware.js'
import { authenticate } from './middlewares/passport.middleware.js'
import { logger } from './utils/logger.js'
import { config } from 'dotenv'

config()
export class App {
	public app: Application

	constructor() {
		this.app = express()
		this.initializeMiddlewares()
		this.initializeRoutes()
		this.initializeErrorHandling()
	}

	/**
	 * Инициализация глобальных middlewares
	 */
	private initializeMiddlewares(): void {
		// Security
		this.app.use(helmet({
			crossOriginResourcePolicy: { policy: 'cross-origin' },
		}))

		// CORS configuration
		this.app.use(cors({
			origin: (origin, callback) => {
				// Разрешаем запросы без origin (например, мобильные приложения, Postman)
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
			credentials: true,
			methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
			allowedHeaders: ['Content-Type', 'Authorization'],
		}))

		// Rate limiting
		const limiter = rateLimit({
			windowMs: 20 * 1000, // 20 секунд
			max: 100, // 100 requests per window
			message: 'Слишком много запросов с этого IP, попробуйте позже',
		})
		this.app.use('/api/', limiter)

		// Auth rate limiting (более строгий)
		const authLimiter = rateLimit({
			windowMs: 20 * 1000,
			max: 5, // 5 попыток авторизации
			message: 'Слишком много попыток входа, попробуйте позже',
		})
		this.app.use('/api/auth/login', authLimiter)

		// Body parsing
		this.app.use(express.json())
		this.app.use(express.urlencoded({ extended: true }))
		this.app.use(cookieParser())

		// HTTP logging
		this.app.use(httpLogger)

		// Passport
		this.app.use(passport.initialize())

		logger.info('Middlewares initialized')
	}

	/**
	 * Инициализация роутов
	 */
	private initializeRoutes(): void {
		// Health check
		this.app.get('/health', (req, res) => {
			res.json({ status: 'ok', timestamp: new Date().toISOString() })
		})

		// Swagger documentation
		this.app.use('/api-docs', swaggerUi.serve)

		this.app.get('/api-docs', (req, res, next) => {
			swaggerUi.setup(swaggerSpec, {
				explorer: true,
				customCss: '.swagger-ui .topbar { display: none }',
				customSiteTitle: 'VideoMeet API',
			})(req, res, next)
		})

		// Swagger JSON
		this.app.get('/api-docs.json', (req, res) => {
			res.setHeader('Content-Type', 'application/json')
			res.send(swaggerSpec)
		})

		// API routes
		this.app.use('/api/auth', authRouter)
		this.app.use('/api/users', authenticate, usersRouter)
		this.app.use('/api/rooms', roomsRouter)
		this.app.use('/api/chat', chatRouter)

		logger.info('Routes initialized')
	}

	/**
	 * Инициализация обработки ошибок
	 */
	private initializeErrorHandling(): void {
		// 404 handler
		this.app.use(notFoundHandler)

		// Global error handler
		this.app.use(errorHandler)

		logger.info('Error handling initialized')
	}

	/**
	 * Получение Express приложения
	 */
	public getApp(): Application {
		return this.app
	}
}
