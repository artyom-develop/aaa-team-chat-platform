import { Room } from '../../../generated/prisma/index.js';

export interface ICreateRoomData {
  name: string;
  password?: string;
  hasLobby?: boolean;
  maxParticipants?: number;
  hostId: string;
}

export interface IUpdateRoomData {
  name?: string;
  password?: string | null;
  hasLobby?: boolean;
  maxParticipants?: number;
}

export interface IRoomWithHost extends Room {
  host: {
    id: string;
    displayName: string;
    avatarUrl: string | null;
  };
}

export interface IRoomsRepository {
  findById(id: string): Promise<Room | null>;
  findBySlug(slug: string): Promise<Room | null>;
  findBySlugWithHost(slug: string): Promise<IRoomWithHost | null>;
  findByHostId(hostId: string): Promise<Room[]>;
  findActive(skip?: number, take?: number): Promise<Room[]>;
  create(data: ICreateRoomData): Promise<Room>;
  update(id: string, data: IUpdateRoomData): Promise<Room>;
  delete(id: string): Promise<void>;
  count(): Promise<number>;
}
