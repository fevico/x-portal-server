import {
  IsEmail,
  IsString,
  MinLength,
  IsOptional,
  IsEnum,
} from 'class-validator';

export class RegisterDto {
  @IsString()
  firstname: string;

  @IsString()
  lastname: string;

  @IsString()
  @IsOptional()
  othername?: string;

  @IsEmail()
  email: string;

  @IsString()
  @IsOptional()
  phone?: string;

  @IsEnum(['male', 'female'])
  @IsOptional()
  gender?: 'male' | 'female';

  @IsString()
  @MinLength(6)
  password: string;

  @IsEnum(['admin', 'superAdmin'])
  role: 'admin' | 'superAdmin';
}
