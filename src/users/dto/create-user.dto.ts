import {
  IsString,
  IsEmail,
  IsOptional,
  IsEnum,
  MinLength,
} from 'class-validator';

export class CreateUserDto {
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

  @IsEnum(['Male', 'Female'])
  @IsOptional()
  gender?: 'Male' | 'Female';

  @IsString()
  @MinLength(6)
  password: string;

  @IsEnum(['admin', 'superAdmin'])
  role: 'admin' | 'superAdmin';

  @IsString()
  @IsOptional()
  schoolId?: string;

  @IsString()
  @IsOptional()
  subRoleId?: string;
}
