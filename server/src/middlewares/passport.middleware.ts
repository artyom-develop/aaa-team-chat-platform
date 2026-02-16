import { Request, Response, NextFunction } from 'express'
import passport from 'passport'
import { PassportJwtStrategy } from '../modules/auth/strategies/jwt.strategy.js'
import { UsersRepository } from '../modules/users/users.repository.js'
import { UnauthorizedException } from '../shared/exceptions/index.js'
import { ErrorMessages } from '../shared/constants/errors.constants.js'
import { IUserPayload } from '../shared/types/express.types.js'

// Инициализация стратегии JWT
const usersRepository = new UsersRepository()
const jwtStrategy = new PassportJwtStrategy(usersRepository)
passport.use('jwt', jwtStrategy.getStrategy())

/**
 * Middleware для проверки JWT токена
 */
export const authenticate = (
	req: Request,
	res: Response,
	next: NextFunction,
): void => {
	passport.authenticate(
		'jwt',
		{ session: false },
		(err: Error, user: IUserPayload | false) => {
			if (err) {
				return next(err)
			}

			if (!user) {
				return next(new UnauthorizedException(ErrorMessages.UNAUTHORIZED))
			}

			req.user = user
			next()
		},
	)(req, res, next)
}
