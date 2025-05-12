// schools/dto/update-school.dto.ts
import { IsString, IsEmail, IsOptional } from 'class-validator';

export class UpdateSchoolDto {
  @IsString()
  @IsOptional()
  name?: string;

  @IsEmail()
  @IsOptional()
  email?: string;

  @IsString()
  @IsOptional()
  contact?: string;

  @IsString()
  @IsOptional()
  address?: string | null;
}
