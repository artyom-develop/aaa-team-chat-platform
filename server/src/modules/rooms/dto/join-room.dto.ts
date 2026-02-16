import { IsString, IsOptional, MinLength, MaxLength } from 'class-validator';

export class JoinRoomDto {
  @IsOptional()
  @IsString()
  @MinLength(4, { message: 'Пароль должен содержать минимум 4 символа' })
  @MaxLength(50, { message: 'Пароль не может превышать 50 символов' })
  password?: string;
}
