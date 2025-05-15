import {
  IsEmail,
  IsNotEmpty,
  IsOptional,
  IsString,
  MinLength,
  ValidateIf,
} from 'class-validator';

export class LoginDto {
  @IsEmail()
  @IsOptional()
  @ValidateIf((o) => !o.username) // Require email if username is not provided
  email?: string;

  @IsString()
  @IsOptional()
  @ValidateIf((o) => !o.email) // Require username if email is not provided
  username?: string;

  @IsString()
  @IsNotEmpty()
  @MinLength(6)
  password: string;
}
