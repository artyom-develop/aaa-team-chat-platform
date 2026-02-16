import { Exclude } from 'class-transformer';
import { Role } from '../../../generated/prisma/index.js';

export class UserResponseDto {
  id!: string;
  displayName!: string;
  email!: string;
  avatarUrl?: string | null;
  role!: Role;
  isActive!: boolean;
  isGuest!: boolean;
  createdAt!: Date;
  updatedAt!: Date;

  @Exclude()
  password!: string;

  @Exclude()
  tokenVersion!: number;

  constructor(partial: Partial<UserResponseDto>) {
    Object.assign(this, partial);
  }
}
