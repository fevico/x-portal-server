import { IsString, MinLength, IsOptional, IsEmail } from 'class-validator';

export class CreateSchoolDto {
  @IsString()
  @MinLength(3)
  name: string;

  @IsEmail()
  @MinLength(3)
  email: string;

  @IsString()
  @MinLength(3)
  contact: string;

  @IsString()
  @IsOptional()
  address?: string;
}
