import { IsString, IsOptional, IsEmail, IsDateString, IsEnum, IsBoolean } from 'class-validator';
import { Gender } from '@prisma/client';

export class CreateAdmissionDto {
  @IsString()
  schoolId: string;

  @IsString()
  @IsOptional()
  presentClassId?: string;

  @IsString()
  classApplyingId: string;

  @IsString()
  surname: string;

  @IsString()
  firstName: string;

  @IsString()
  address: string;

  @IsEnum(Gender)
  gender: Gender;

  @IsString()
  phone: string;

  @IsEmail()
  email: string;

  @IsDateString()
  dateOfBirth: string;

  @IsString()
  religion: string;

  @IsString()
  nationality: string;

  @IsString()
  stateOfOrigin: string;

  @IsString()
  localGovernment: string;

  // Guardian fields
  @IsString()
  guardianSurname: string;

  @IsString()
  @IsOptional()
  guardianMiddleName?: string;

  @IsEmail()
  guardianEmail: string;

  @IsString()
  @IsOptional()
  guardianPhone?: string;

  @IsString()
  @IsOptional()
  guardianAddress?: string;
}

export class UpdateAdmissionDto {
  @IsString()
  @IsOptional()
  presentClassId?: string;

  @IsString()
  @IsOptional()
  classApplyingId?: string;

  @IsString()
  @IsOptional()
  surname?: string;

  @IsString()
  @IsOptional()
  firstName?: string;

  @IsString()
  @IsOptional()
  address?: string;

  @IsEnum(Gender)
  @IsOptional()
  gender?: Gender;

  @IsString()
  @IsOptional()
  phone?: string;

  @IsEmail()
  @IsOptional()
  email?: string;

  @IsDateString()
  @IsOptional()
  dateOfBirth?: string;

  @IsString()
  @IsOptional()
  religion?: string;

  @IsString()
  @IsOptional()
  nationality?: string;

  @IsString()
  @IsOptional()
  stateOfOrigin?: string;

  @IsString()
  @IsOptional()
  localGovernment?: string;

  @IsBoolean()
  @IsOptional()
  isDeleted?: boolean;

  // Guardian fields
  @IsString()
  @IsOptional()
  guardianSurname?: string;

  @IsString()
  @IsOptional()
  guardianMiddleName?: string;

  @IsEmail()
  @IsOptional()
  guardianEmail?: string;

  @IsString()
  @IsOptional()
  guardianPhone?: string;

  @IsString()
  @IsOptional()
  guardianAddress?: string;
}