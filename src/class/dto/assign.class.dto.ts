import { IsString, IsArray, ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';

// DTO for a single class-arm assignment
export class ClassArmAssignmentDto {
  @IsString()
  classId: string;

  @IsString()
  sessionId: string;

  @IsArray()
  // Removed ArrayNotEmpty to allow empty arrays (e.g., for "No Arms")
  arms: string[];
}

// DTO for the entire payload (array of assignments)
export class AssignClassArmsDto {
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => ClassArmAssignmentDto)
  assignments: ClassArmAssignmentDto[];
}
