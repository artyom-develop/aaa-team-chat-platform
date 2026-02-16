import { IsString, IsOptional, IsUrl, MinLength, MaxLength } from 'class-validator';

export class UpdateUserDto {
  @IsOptional()
  @IsString()
  @MinLength(2)
  @MaxLength(50)
  displayName?: string;

  @IsOptional()
  @IsUrl()
  avatarUrl?: string;
}
