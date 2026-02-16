import { Response, NextFunction, Router } from 'express';
import { ChatService } from './chat.service.js';
import { IAuthenticatedRequest } from '../../shared/types/express.types.js';
import { ResponseUtil } from '../../utils/response.util.js';
import { plainToClass } from 'class-transformer';
import { MessageResponseDto } from './dto/message-response.dto.js';
import { IController } from '../../shared/interfaces/IController.js';

export class ChatController implements IController {
  public readonly router: Router;

  constructor(private readonly chatService: ChatService) {
    this.router = Router();
  }

  /**
   * GET /api/chat/:roomSlug/messages - Получение истории сообщений
   */
  getMessages = async (
    req: IAuthenticatedRequest,
    res: Response,
    next: NextFunction
  ): Promise<void> => {
    try {
      const roomSlug = Array.isArray(req.params.roomSlug) ? req.params.roomSlug[0] : req.params.roomSlug;
      const page = parseInt(req.query.page as string) || 1;
      const limit = parseInt(req.query.limit as string) || 50;

      const result = await this.chatService.getMessages(roomSlug, page, limit);

      const messagesResponse = result.messages.map((message) =>
        plainToClass(MessageResponseDto, message, { excludeExtraneousValues: false })
      );

      ResponseUtil.paginated(res, messagesResponse, result.page, result.limit, result.total);
    } catch (error) {
      next(error);
    }
  };
}
