import { Request, Response, NextFunction, Router } from 'express'
import { AuthService } from './auth.service.js'
import { ResponseUtil } from '../../utils/response.util.js'
import { plainToClass } from 'class-transformer'
import { UserResponseDto } from '../users/dto/user-response.dto.js'
import { IController } from '../../shared/interfaces/IController.js'
import { RegisterDto } from './dto/register.dto.js'
import { LoginDto } from './dto/login.dto.js'
import { GuestLoginDto } from './dto/guest-login.dto.js'
import { IAuthenticatedRequest } from '../../shared/types/express.types.js'

export class AuthController implements IController {
	public readonly router: Router

	constructor(private readonly authService: AuthService) {
		this.router = Router()
	}

	/**
	 * POST /api/auth/register - Регистрация пользователя
	 */
	register = async (
		req: Request,
		res: Response,
		next: NextFunction,
	): Promise<void> => {
		try {
			const registerData: RegisterDto = req.body

			const result = await this.authService.register({
				displayName: registerData.displayName,
				email: registerData.email,
				password: registerData.password,
			})

			const userResponse = plainToClass(UserResponseDto, result.user, {
				excludeExtraneousValues: false,
			})

			// Сохраняем refreshToken в httpOnly cookie (30 дней)
			res.cookie('refreshToken', result.tokens.refreshToken, {
				httpOnly: true,
				secure: process.env.NODE_ENV === 'production',
				sameSite: 'lax',
				maxAge: 30 * 24 * 60 * 60 * 1000, // 30 дней
			})

			ResponseUtil.created(
				res,
				{
					user: userResponse,
					accessToken: result.tokens.accessToken,
					refreshToken: result.tokens.refreshToken,
				},
				'Регистрация успешна',
			)
		} catch (error) {
			next(error)
		}
	}

	/**
	 * POST /api/auth/login - Авторизация пользователя
	 */
	login = async (
		req: Request,
		res: Response,
		next: NextFunction,
	): Promise<void> => {
		try {
			const loginData: LoginDto = req.body

			const result = await this.authService.login({
				email: loginData.email,
				password: loginData.password,
			})

			const userResponse = plainToClass(UserResponseDto, result.user, {
				excludeExtraneousValues: false,
			})

			// Сохраняем refreshToken в httpOnly cookie (30 дней)
			res.cookie('refreshToken', result.tokens.refreshToken, {
				httpOnly: true,
				secure: process.env.NODE_ENV === 'production',
				sameSite: 'lax',
				maxAge: 30 * 24 * 60 * 60 * 1000, // 30 дней
			})

			ResponseUtil.success(
				res,
				{
					user: userResponse,
					accessToken: result.tokens.accessToken,
					refreshToken: result.tokens.refreshToken,
				},
				'Авторизация успешна',
			)
		} catch (error) {
			next(error)
		}
	}

	/**
	 * POST /api/auth/guest - Быстрый вход для гостей
	 */
	guestLogin = async (
		req: Request,
		res: Response,
		next: NextFunction,
	): Promise<void> => {
		try {
			const guestData: GuestLoginDto = req.body

			const result = await this.authService.guestLogin(guestData.displayName)

			const userResponse = plainToClass(UserResponseDto, result.user, {
				excludeExtraneousValues: false,
			})

			// Сохраняем refreshToken в httpOnly cookie (30 дней)
			res.cookie('refreshToken', result.tokens.refreshToken, {
				httpOnly: true,
				secure: process.env.NODE_ENV === 'production',
				sameSite: 'lax',
				maxAge: 30 * 24 * 60 * 60 * 1000, // 30 дней
			})

			ResponseUtil.created(
				res,
				{
					user: userResponse,
					accessToken: result.tokens.accessToken,
					refreshToken: result.tokens.refreshToken,
				},
				'Гостевой вход выполнен',
			)
		} catch (error) {
			next(error)
		}
	}

	/**
	 * POST /api/auth/logout - Выход из системы
	 */
	logout = async (
		req: IAuthenticatedRequest,
		res: Response,
		next: NextFunction,
	): Promise<void> => {
		try {
			const userId = req.user!.id
			const token = req.headers.authorization?.split(' ')[1] || ''

			await this.authService.logout(userId, token)

			// Удаляем refreshToken из cookie
			res.clearCookie('refreshToken', {
				httpOnly: true,
				secure: process.env.NODE_ENV === 'production',
			sameSite: 'lax',
			})

			ResponseUtil.success(res, null, 'Выход выполнен успешно')
		} catch (error) {
			next(error)
		}
	}

	/**
	 * POST /api/auth/refresh - Обновить access token
	 */
	refresh = async (
		req: Request,
		res: Response,
		next: NextFunction,
	): Promise<void> => {
		try {
			// Читаем refreshToken из cookie
			const refreshToken = req.cookies?.refreshToken || req.body?.refreshToken
			const oldAccessToken = req.headers.authorization?.split(' ')[1] || ''

			if (!refreshToken) {
				ResponseUtil.badRequest(res, 'Refresh token is required')
				return
			}

			// Обновляем токены и добавляем старый accessToken в blacklist
			const tokens = await this.authService.refreshToken(
				refreshToken,
				oldAccessToken,
			)

			// Обновляем refreshToken в cookie
			res.cookie('refreshToken', tokens.refreshToken, {
				httpOnly: true,
				secure: process.env.NODE_ENV === 'production',
				sameSite: 'lax',
				maxAge: 7 * 24 * 60 * 60 * 1000, // 7 дней
			})

			ResponseUtil.success(
				res,
				{
					accessToken: tokens.accessToken,
					refreshToken: tokens.refreshToken,
				},
				'Токены обновлены',
			)
		} catch (error) {
			next(error)
		}
	}
}
