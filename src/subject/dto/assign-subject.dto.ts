import {
  IsArray,
  IsString,
  IsNotEmpty,
  ValidateNested,
  ArrayMinSize,
} from 'class-validator';
import { Type } from 'class-transformer';

export class ClassArmAssignmentDto {
  @IsString()
  @IsNotEmpty()
  classId: string;

  @IsArray()
  @ArrayMinSize(1, { message: 'At least one class arm must be selected' })
  @IsString({ each: true })
  classArmIds: string[];
}

export class AssignSubjectToClassesDto {
  @IsArray()
  @ArrayMinSize(1, { message: 'At least one class must be provided' })
  @ValidateNested({ each: true })
  @Type(() => ClassArmAssignmentDto)
  assignments: ClassArmAssignmentDto[];
}
