import { IsString, IsOptional, IsBoolean, IsInt, Min, Max, MinLength, MaxLength } from 'class-validator';

export class CreateRoomDto {
  @IsString()
  @MinLength(3, { message: 'Название комнаты должно содержать минимум 3 символа' })
  @MaxLength(100, { message: 'Название комнаты не может превышать 100 символов' })
  name!: string;

  @IsOptional()
  @IsString()
  @MinLength(4, { message: 'Пароль должен содержать минимум 4 символа' })
  @MaxLength(50, { message: 'Пароль не может превышать 50 символов' })
  password?: string;

  @IsOptional()
  @IsBoolean()
  hasLobby?: boolean;

  @IsOptional()
  @IsInt()
  @Min(2, { message: 'Минимальное количество участников - 2' })
  @Max(50, { message: 'Максимальное количество участников - 50' })
  maxParticipants?: number;
}
