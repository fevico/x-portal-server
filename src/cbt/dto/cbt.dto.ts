import { IsNotEmpty, IsString, IsArray, IsInt, Min, ArrayNotEmpty, ValidateNested, IsOptional } from 'class-validator';
import { Type } from 'class-transformer';

class OptionDto {
  @IsNotEmpty()
  @IsString()
  optionText: string;
}

class QuestionDto {
  @IsNotEmpty()
  @IsString()
  questionText: string;

  @IsArray()
  @ArrayNotEmpty()
  @ValidateNested({ each: true })
  @Type(() => OptionDto)
  options: OptionDto[];

  @IsInt()
  @Min(0)
  correctOptionIndex: number;
}

export class CreateQuestionsDto {
  @IsNotEmpty()
  @IsString()
  subjectId: string;

  @IsNotEmpty()
  @IsString()
  classId: string;

  @IsArray()
  @ArrayNotEmpty()
  @ValidateNested({ each: true })
  @Type(() => QuestionDto)
  questions: QuestionDto[];
}


export class DeleteQuestionsDto {
  @IsNotEmpty()
  @IsString()
  subjectId: string;

  @IsNotEmpty()
  @IsString()
  classId: string;
}

export class FetchAllQuestionsDto {
  @IsOptional()
  @IsInt()
  @Min(1)
  page?: number = 1;

  @IsOptional()
  @IsInt()
  @Min(1)
  limit?: number = 10;

  @IsOptional()
  @IsString()
  search?: string;
}

export class FetchClassesBySubjectDto {
  @IsNotEmpty()
  @IsString()
  subjectId: string;
}

export class FetchQuestionsByIdDto {
  @IsNotEmpty()
  @IsString()
  subjectId: string;

  @IsNotEmpty()
  @IsString()
  classId: string;

  @IsOptional()
  @IsString()
  schoolId?: string;
}