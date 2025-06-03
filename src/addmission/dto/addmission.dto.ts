import {
  IsString,
  IsEmail,
  IsOptional,
  IsDateString,
  IsEnum,
  ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';
import { Gender } from '@prisma/client';

export class StudentDto {
  @IsString()
  firstname: string;

  @IsString()
  lastname: string;

  @IsEnum(['male', 'female'])
  @IsOptional()
  gender?: Gender;

  @IsString()
  @IsOptional()
  homeAddress?: string;

  @IsString()
  @IsOptional()
  contact?: string;

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
  lga?: string;
}

export class ParentDto {
  @IsString()
  lastname: string;

  @IsString()
  firstname: string;

  @IsString()
  @IsOptional()
  othername?: string;

  @IsString()
  @IsOptional()
  address?: string;

  @IsString()
  @IsOptional()
  contact?: string;

  @IsEmail()
  @IsOptional()
  email?: string;

  @IsString()
  @IsOptional()
  relationship?: string;
}

export class FormerSchoolDto {
  @IsString()
  @IsOptional()
  name?: string;

  @IsString()
  @IsOptional()
  address?: string;

  @IsString()
  @IsOptional()
  contact?: string;
}

export class OtherInfoDto {
  @IsString()
  @IsOptional()
  healthProblems?: string;

  @IsString()
  @IsOptional()
  howHeardAboutUs?: string;
}

export class CreateAdmissionDto {
  @IsString()
  sessionId: string;

  @IsString()
  schoolId: string;

  @IsString()
  @IsOptional()
  presentClassId?: string;

  @IsString()
  classApplyingForId: string;

  @ValidateNested()
  @Type(() => StudentDto)
  student: StudentDto;

  @ValidateNested()
  @Type(() => ParentDto)
  parent: ParentDto;

  @ValidateNested()
  @Type(() => FormerSchoolDto)
  formerSchool: FormerSchoolDto;

  @ValidateNested()
  @Type(() => OtherInfoDto)
  otherInfo: OtherInfoDto;
}           

export class UpdateStudentDto {
  @IsString()
  @IsOptional()
  firstname?: string;

  @IsString()
  @IsOptional()
  lastname?: string;

  @IsEnum(['male', 'female'])
  @IsOptional()
  gender?: Gender;

  @IsString()
  @IsOptional()
  homeAddress?: string;

  @IsString()
  @IsOptional()
  contact?: string;

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
  lga?: string;
}

export class UpdateParentDto {
  @IsString()
  @IsOptional()
  lastname?: string;

  @IsString()
  @IsOptional()
  firstname?: string;

  @IsString()
  @IsOptional()
  othername?: string;

  @IsString()
  @IsOptional()
  address?: string;

  @IsString()
  @IsOptional()
  contact?: string;

  @IsEmail()
  @IsOptional()
  email?: string;

  @IsString()
  @IsOptional()
  relationship?: string;
}

export class UpdateFormerSchoolDto {
  @IsString()
  @IsOptional()
  name?: string;

  @IsString()
  @IsOptional()
  address?: string;

  @IsString()
  @IsOptional()
  contact?: string;
}

export class UpdateOtherInfoDto {
  @IsString()
  @IsOptional()
  healthProblems?: string;

  @IsString()
  @IsOptional()
  howHeardAboutUs?: string;
}

export class UpdateAdmissionDto {
  @IsString()
  @IsOptional()
  sessionId?: string;

  @IsString()
  @IsOptional()
  presentClassId?: string;

  @IsString()
  @IsOptional()
  classApplyingForId?: string;

  @IsString()
  @IsOptional()
  classId?: string;

  @IsString()
  @IsOptional()
  classArmId?: string;

  @ValidateNested()
  @Type(() => UpdateStudentDto)
  @IsOptional()
  student?: UpdateStudentDto;

  @ValidateNested()
  @Type(() => UpdateParentDto)
  @IsOptional()
  parent?: UpdateParentDto;

  @ValidateNested()
  @Type(() => UpdateFormerSchoolDto)
  @IsOptional()
  formerSchool?: UpdateFormerSchoolDto;

  @ValidateNested()
  @Type(() => UpdateOtherInfoDto)
  @IsOptional()
  otherInfo?: UpdateOtherInfoDto;
}

export class AcceptAdmissionDto {
  @IsString()
  classId: string;

  @IsString()
  classArmId: string;
}

export class RejectAdmissionDto {
  @IsString()
  @IsOptional()
  rejectionReason?: string;
}
