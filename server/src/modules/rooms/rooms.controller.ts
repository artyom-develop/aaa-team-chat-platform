import { Response, NextFunction, Router } from 'express';
import { RoomsService } from './rooms.service.js';
import { IAuthenticatedRequest } from '../../shared/types/express.types.js';
import { ResponseUtil } from '../../utils/response.util.js';
import { plainToClass } from 'class-transformer';
import { RoomResponseDto } from './dto/room-response.dto.js';
import { CreateRoomDto } from './dto/create-room.dto.js';
import { JoinRoomDto } from './dto/join-room.dto.js';
import { IController } from '../../shared/interfaces/IController.js';
import { TurnConfig } from '../../config/turn.config.js';

export class RoomsController implements IController {
  public readonly router: Router;

  constructor(private readonly roomsService: RoomsService) {
    this.router = Router();
  }

  /**
   * POST /api/rooms - Создание новой комнаты
   */
  create = async (
    req: IAuthenticatedRequest,
    res: Response,
    next: NextFunction
  ): Promise<void> => {
    try {
      const createData: CreateRoomDto = req.body;

      const room = await this.roomsService.createRoom(createData, req.user!.id);

      const roomResponse = plainToClass(RoomResponseDto, room, {
        excludeExtraneousValues: false,
      });

      ResponseUtil.created(res, roomResponse, 'Комната успешно создана');
    } catch (error) {
      next(error);
    }
  };

  /**
   * GET /api/rooms/:slug - Получение информации о комнате
   */
  getBySlug = async (
    req: IAuthenticatedRequest,
    res: Response,
    next: NextFunction
  ): Promise<void> => {
    try {
      const slug = Array.isArray(req.params.slug) ? req.params.slug[0] : req.params.slug;
      const room = await this.roomsService.getRoomBySlug(slug);

      const roomResponse = plainToClass(RoomResponseDto, room, {
        excludeExtraneousValues: false,
      });

      ResponseUtil.success(res, roomResponse);
    } catch (error) {
      next(error);
    }
  };

  /**
   * POST /api/rooms/:slug/join - Присоединение к комнате
   */
  join = async (
    req: IAuthenticatedRequest,
    res: Response,
    next: NextFunction
  ): Promise<void> => {
    try {
      const slug = Array.isArray(req.params.slug) ? req.params.slug[0] : req.params.slug;
      const joinData: JoinRoomDto = req.body;

      const room = await this.roomsService.joinRoom(slug, joinData.password);

      const roomResponse = plainToClass(RoomResponseDto, room, {
        excludeExtraneousValues: false,
      });

      ResponseUtil.success(res, roomResponse, 'Успешное подключение к комнате');
    } catch (error) {
      next(error);
    }
  };

  /**
   * GET /api/rooms/my - Получение комнат пользователя
   */
  getMy = async (
    req: IAuthenticatedRequest,
    res: Response,
    next: NextFunction
  ): Promise<void> => {
    try {
      const rooms = await this.roomsService.getMyRooms(req.user!.id);

      const roomsResponse = rooms.map((room) =>
        plainToClass(RoomResponseDto, room, { excludeExtraneousValues: false })
      );

      ResponseUtil.success(res, roomsResponse);
    } catch (error) {
      next(error);
    }
  };

  /**
   * DELETE /api/rooms/:slug - Удаление комнаты
   */
  delete = async (
    req: IAuthenticatedRequest,
    res: Response,
    next: NextFunction
  ): Promise<void> => {
    try {
      const slug = Array.isArray(req.params.slug) ? req.params.slug[0] : req.params.slug;
      await this.roomsService.deleteRoom(slug, req.user!);

      ResponseUtil.success(res, null, 'Комната удалена');
    } catch (error) {
      next(error);
    }
  };

  /**
   * GET /api/rooms/ice-servers - Получение ICE серверов для WebRTC
   */
  getIceServers = async (
    req: IAuthenticatedRequest,
    res: Response,
    next: NextFunction
  ): Promise<void> => {
    try {
      const iceServers = TurnConfig.getIceServers();
      ResponseUtil.success(res, { iceServers });
    } catch (error) {
      next(error);
    }
  };
}
