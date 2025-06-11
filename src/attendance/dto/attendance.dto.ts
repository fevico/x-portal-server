import {
  IsString,
  IsNotEmpty,
  IsArray,
  IsDateString,
  ValidateNested,
  IsOptional,
} from 'class-validator';
import { Type } from 'class-transformer';

export class GetStudentAttendanceDto {
  // @IsString()
  // @IsNotEmpty()
  // schoolId: string;

  @IsString()
  @IsNotEmpty()
  sessionId: string;

  // @IsString()
  // @IsNotEmpty()
  // termId: string;

  @IsString()
  @IsNotEmpty()
  classId: string;

  @IsString()
  @IsNotEmpty()
  classArmId: string;
}

class StudentAttendance {
  @IsString()
  @IsNotEmpty()
  studentId: string;

  @IsString()
  @IsNotEmpty()
  attendanceStatus: 'present' | 'absent' | 'late';
}

export class AssignStudentToClassDto {
  @IsString()
  @IsNotEmpty()
  studentId: string;

  @IsString()
  @IsNotEmpty()
  sessionId: string;

  @IsString()
  @IsNotEmpty()
  termId: string;

  @IsString()
  @IsNotEmpty()
  classId: string;

  @IsString()
  @IsNotEmpty()
  classArmId: string;

  @IsString()
  @IsNotEmpty()
  schoolId: string;

  @IsString()
  @IsNotEmpty()
  userId: string;
}

export class StudentPromotionDto {
  @IsString()
  @IsNotEmpty()
  schoolId: string;

  @IsString()
  @IsNotEmpty()
  sourceClassId: string;

  @IsString()
  @IsNotEmpty()
  targetClassId: string;

  @IsString()
  @IsNotEmpty()
  sessionId: string;

  @IsString()
  @IsNotEmpty()
  termId: string;

  @IsString()
  @IsOptional()
  classArmId?: string;

  @IsString()
  @IsNotEmpty()
  createdBy: string;
}

export class MarkStudentAttendanceDto {
  @IsString()
  @IsNotEmpty()
  schoolId: string;

  @IsString()
  @IsNotEmpty()
  sessionId: string;

  @IsString()
  @IsNotEmpty()
  termId: string;

  @IsString()
  @IsNotEmpty()
  classId: string;

  @IsString()
  @IsNotEmpty()
  classArmId: string;

  @IsDateString()
  @IsNotEmpty()
  date: string;

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => StudentAttendance)
  students: StudentAttendance[];

  @IsString()
  @IsNotEmpty()
  createdBy: string;
}
