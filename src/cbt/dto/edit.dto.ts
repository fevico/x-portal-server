import { IsNotEmpty, IsString, IsArray, IsInt, Min, ArrayNotEmpty, ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';
import { CreateQuestionsDto } from './cbt.dto';

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

export class EditQuestionsDto extends CreateQuestionsDto {}