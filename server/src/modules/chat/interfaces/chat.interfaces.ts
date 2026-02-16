import { ChatMessage } from '../../../generated/prisma/index.js';

export interface ICreateMessageData {
  roomId: string;
  userId: string;
  text: string;
  replyToId?: string;
}

export interface IMessageWithUser extends ChatMessage {
  user: {
    id: string;
    displayName: string;
    avatarUrl: string | null;
  };
  replyTo?: {
    id: string;
    text: string;
    user: {
      displayName: string;
    };
  } | null;
}

export interface IChatRepository {
  findByRoomId(roomId: string, skip?: number, take?: number): Promise<IMessageWithUser[]>;
  findById(id: string): Promise<IMessageWithUser | null>;
  create(data: ICreateMessageData): Promise<ChatMessage>;
  countByRoomId(roomId: string): Promise<number>;
}
