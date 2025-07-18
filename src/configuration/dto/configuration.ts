import { AssessmentType } from '@prisma/client';
import { IsOptional, IsString } from 'class-validator';

export class UpdateSchoolInfoDto {
  @IsOptional()
  @IsString()
  name?: string;

  @IsOptional()
  @IsString()
  email?: string;

  @IsOptional()
  @IsString()
  country?: string;

  @IsOptional()
  @IsString()
  state?: string;

  @IsOptional()
  @IsString()
  color?: string;

  @IsOptional()
  @IsString()
  address?: string;

  @IsOptional()
  @IsString()
  bursarContact?: string;

  @IsOptional()
  @IsString()
  bursarName?: string;

  @IsOptional()
  @IsString()
  bursarSignatureBase64?: string;

  @IsOptional()
  @IsString()
  principalContact?: string;

  @IsOptional()
  @IsString()
  principalName?: string;

  @IsString()
  @IsOptional()
  principalSignatureBase64?: string;

  @IsOptional()
  @IsString()
  schoolHeadContact?: string;

  @IsOptional()
  @IsString()
  schoolHeadName?: string;

  @IsOptional()
  @IsString()
  schoolHeadSignatureBase64?: string;

  @IsOptional()
  @IsString()
  logoBase64?: string;
}

export interface CreateGradingSystemDto {
  name: string;
  grades: Array<{
    id: string;
    name: string;
    scoreStartPoint: number;
    scoreEndPoint: number;
    remark?: string;
    teacherComment?: string;
    principalComment?: string;
  }>;
}

export interface AssignClassesDto {
  classIds: string[];
}

export interface CreateMarkingSchemeDto {
  name: string;
  components: Array<{
    name: string;
    score: number;
    type: AssessmentType;
  }>;
}

export interface UpdateContinuousAssessmentDto {
  components: Array<{
    name: string;
    score: number;
  }>;
}

export interface AssignMarkingSchemeDto {
  assignments: Array<{
    classId: string;
    termDefinitionId: string;
  }>;
}
