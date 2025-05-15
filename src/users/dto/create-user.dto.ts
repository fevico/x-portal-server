import { IsString, IsOptional, IsEnum, IsNotEmpty } from 'class-validator';

export class CreateUserDto {
  @IsString()
  @IsNotEmpty()
  firstname: string;

  @IsString()
  @IsNotEmpty()
  lastname: string;

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
  @IsNotEmpty()
  password: string;

  @IsEnum(['admin', 'superAdmin'])
  @IsOptional()
  role?: 'admin' | 'superAdmin' = 'admin'; // Default to admin

  @IsString()
  @IsOptional()
  schoolId?: string;

  @IsString()
  @IsOptional()
  subRoleId?: string;

  // Optional fields for Staff, Student, or Parent
  @IsString()
  @IsOptional()
  staffId?: string; // For Staff

  @IsString()
  @IsOptional()
  department?: string; // For Staff

  @IsString()
  @IsOptional()
  position?: string; // For Staff

  @IsString()
  @IsOptional()
  studentId?: string; // For Student

  @IsString()
  @IsOptional()
  class?: string; // For Student

  @IsString()
  @IsOptional()
  parentId?: string; // For Student

  @IsString()
  @IsOptional()
  occupation?: string; // For Parent

  @IsString()
  @IsOptional()
  relationship?: string; // For Parent
}
