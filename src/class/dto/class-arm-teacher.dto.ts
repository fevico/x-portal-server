import { IsString } from 'class-validator';

export class AssignClassArmTeacherDto {
  @IsString()
  staffId: string;

  @IsString()
  classId: string;

  @IsString()
  classArmId: string;
}

export class GetClassArmTeacherDto {
  @IsString()
  classId: string;

  @IsString()
  classArmId: string;
}
