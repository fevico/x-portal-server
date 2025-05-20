import { IsString, IsArray, ArrayNotEmpty } from 'class-validator';

export class AssignClassArmsDto {
  @IsString()
  classId: string;

  @IsArray()
  @ArrayNotEmpty()
  classArmIds: string[];
}