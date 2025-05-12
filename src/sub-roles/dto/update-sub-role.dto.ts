import { IsString, MinLength, IsOptional, IsArray } from 'class-validator';

export class UpdateSubRoleDto {
  @IsString()
  @MinLength(3)
  @IsOptional()
  name?: string;

  @IsString()
  @IsOptional()
  schoolId: string;

  @IsString()
  @IsOptional()
  description?: string;

  @IsArray()
  @IsOptional()
  permissionIds?: string[];
}
