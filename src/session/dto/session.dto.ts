import { IsString, IsNotEmpty, IsDateString } from 'class-validator';

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
