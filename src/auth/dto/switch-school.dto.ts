import { IsString } from 'class-validator';

export class SwitchSchoolDto {
  @IsString()
  schoolId: string;
}
