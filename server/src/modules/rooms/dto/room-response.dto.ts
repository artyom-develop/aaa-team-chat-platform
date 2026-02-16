import { Exclude } from 'class-transformer';

export class RoomResponseDto {
  id!: string;
  slug!: string;
  name!: string;
  hasLobby!: boolean;
  maxParticipants!: number;
  hostId!: string;
  createdAt!: Date;
  updatedAt!: Date;

  // Опциональное поле хоста (если загружено)
  host?: {
    id: string;
    displayName: string;
    avatarUrl: string | null;
  };

  @Exclude()
  password?: string | null;

  constructor(partial: Partial<RoomResponseDto>) {
    Object.assign(this, partial);
  }
}
