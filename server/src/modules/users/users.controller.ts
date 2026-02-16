import { Response, NextFunction, Router } from 'express';
import { UsersService } from './users.service.js';
import { IAuthenticatedRequest } from '../../shared/types/express.types.js';
import { ResponseUtil } from '../../utils/response.util.js';
import { plainToClass } from 'class-transformer';
import { UserResponseDto } from './dto/user-response.dto.js';
import { UpdateUserDto } from './dto/update-user.dto.js';
import { IController } from '../../shared/interfaces/IController.js';

export class UsersController implements IController {
  public readonly router: Router;

  constructor(private readonly usersService: UsersService) {
    this.router = Router();
  }

  /**
   * GET /api/users/me - Получение собственного профиля
   */
  getMe = async (
    req: IAuthenticatedRequest,
    res: Response,
    next: NextFunction
  ): Promise<void> => {
    try {
      const user = await this.usersService.getMe(req.user!.id);
      
      const userResponse = plainToClass(UserResponseDto, user, {
        excludeExtraneousValues: false,
      });

      ResponseUtil.success(res, userResponse);
    } catch (error) {
      next(error);
    }
  };

  /**
   * PATCH /api/users/me - Обновление собственного профиля
   */
  updateMe = async (
    req: IAuthenticatedRequest,
    res: Response,
    next: NextFunction
  ): Promise<void> => {
    try {
      const updateData: UpdateUserDto = req.body;
      const user = await this.usersService.updateMe(req.user!.id, updateData);

      const userResponse = plainToClass(UserResponseDto, user, {
        excludeExtraneousValues: false,
      });

      ResponseUtil.success(res, userResponse, 'Профиль обновлён');
    } catch (error) {
      next(error);
    }
  };
}
