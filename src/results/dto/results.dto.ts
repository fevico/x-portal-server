import { AssessmentType } from '@prisma/client';
import { IsOptional, IsString } from 'class-validator';

export class GetResultsQueryDto {
  @IsString()
  @IsOptional()
  q?: string;

  @IsString()
  @IsOptional()
  page?: string;

  @IsString()
  @IsOptional()
  limit?: string;

  @IsString()
  @IsOptional()
  all?: boolean;

  @IsString()
  @IsOptional()
  type?: AssessmentType;
}

export class computeResultsDto {
  @IsString()
  sessionId: string;

  @IsString()
  termId: string;

  @IsString()
  classId: string;

  @IsString()
  classArmId: string;

  @IsString()
  resultScope: AssessmentType;

  @IsString()
  resultTypeId: string;
}
