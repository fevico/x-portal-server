import { IsString, MinLength, IsOptional } from 'class-validator';

export class UpdateSchoolDto {
  @IsString()
  @MinLength(3)
  @IsOptional()
  name?: string;

  @IsString()
  @IsOptional()
  address?: string;
}
