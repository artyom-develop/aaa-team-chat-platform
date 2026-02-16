import { IsString, MinLength, MaxLength } from 'class-validator';

export class GuestLoginDto {
  @IsString()
  @MinLength(2, { message: 'Display name must be at least 2 characters long' })
  @MaxLength(50, { message: 'Display name must not exceed 50 characters' })
  displayName!: string;
}
