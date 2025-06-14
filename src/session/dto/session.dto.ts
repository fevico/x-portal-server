import { Type } from 'class-transformer';
import {
  IsString,
  IsNotEmpty,
  IsDateString,
  IsArray,
  ArrayMinSize,
  ValidateNested,
} from 'class-validator';

export class CreateSessionDto {
  @IsString()
  @IsNotEmpty()
  session: string;

  @IsDateString()
  @IsNotEmpty()
  firstTermStartDate: string;

  @IsDateString()
  @IsNotEmpty()
  firstTermEndDate: string;

  @IsDateString()
  @IsNotEmpty()
  secondTermStartDate: string;

  @IsDateString()
  @IsNotEmpty()
  secondTermEndDate: string;

  @IsDateString()
  @IsNotEmpty()
  thirdTermStartDate: string;

  @IsDateString()
  @IsNotEmpty()
  thirdTermEndDate: string;
}

export class SessionClassAssignmentDto {
  @IsString()
  @IsNotEmpty()
  classId: string;

  @IsArray()
  @ArrayMinSize(1, { message: 'At least one class arm must be selected' })
  @IsString({ each: true })
  classArmIds: string[];
}

export class AssignClassToSessionDto {
  @IsArray()
  @ArrayMinSize(1, { message: 'At least one class must be provided' })
  @ValidateNested({ each: true })
  @Type(() => SessionClassAssignmentDto)
  assignments: SessionClassAssignmentDto[];
}
