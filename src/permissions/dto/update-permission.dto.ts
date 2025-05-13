import { PermissionScope } from '@prisma/client';
import { IsString, MinLength, IsOptional } from 'class-validator';

export class UpdatePermissionDto {
  @IsString()
  @MinLength(3)
  @IsOptional()
  name?: string;

  @IsString()
  @IsOptional()
  description?: string;

  @IsString()
  @IsOptional()
  scope?: PermissionScope;
}
