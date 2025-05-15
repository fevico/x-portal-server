import { IsString, IsOptional, IsEnum, IsInt, Min } from 'class-validator';
import { Type } from 'class-transformer';

// DTO for updating a user
export class UpdateUserDto {
  @IsString()
  @IsOptional()
  firstname?: string;

  @IsString()
  @IsOptional()
  lastname?: string;

  @IsString()
  @IsOptional()
  othername?: string;

  @IsString()
  @IsOptional()
  email?: string;

  @IsString()
  @IsOptional()
  phone?: string;

  @IsEnum(['male', 'female'])
  @IsOptional()
  gender?: 'male' | 'female';

  @IsString()
  @IsOptional()
  schoolId?: string;

  @IsString()
  @IsOptional()
  subRoleId?: string;

  // Fields for Staff, Student, Parent
  @IsString()
  @IsOptional()
  staffId?: string;

  @IsString()
  @IsOptional()
  department?: string;

  @IsString()
  @IsOptional()
  position?: string;

  @IsString()
  @IsOptional()
  studentId?: string;

  @IsString()
  @IsOptional()
  class?: string;

  @IsString()
  @IsOptional()
  parentId?: string;

  @IsString()
  @IsOptional()
  occupation?: string;

  @IsString()
  @IsOptional()
  relationship?: string;
}

// DTO for viewing users (query parameters)
export class GetUsersQueryDto {
  @IsString()
  @IsOptional()
  schoolId?: string;

  @IsString()
  @IsOptional()
  q?: string; // Search term for firstname, lastname, email

  @IsEnum(['male', 'female'])
  @IsOptional()
  gender?: 'male' | 'female';

  @IsString()
  @IsOptional()
  subRoleId?: string;

  @IsInt()
  @Min(1)
  @IsOptional()
  @Type(() => Number)
  page?: number = 1;

  @IsInt()
  @Min(1)
  @IsOptional()
  @Type(() => Number)
  limit?: number = 10;
}
