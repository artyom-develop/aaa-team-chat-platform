import { IsEmail, IsString, IsOptional, IsDateString, MinLength, MaxLength } from 'class-validator';

export class CreateUserDto {
  @IsString()
  @MinLength(2)
  @MaxLength(50)
  firstName!: string;

  @IsString()
  @MinLength(2)
  @MaxLength(50)
  lastName!: string;

  @IsOptional()
  @IsString()
  @MaxLength(50)
  middleName?: string;

  @IsDateString()
  dateOfBirth!: string;

  @IsEmail()
  email!: string;

  @IsString()
  @MinLength(8)
  @MaxLength(100)
  password!: string;
}
