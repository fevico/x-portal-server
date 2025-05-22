import { IsString, IsBoolean, IsOptional, IsDateString } from 'class-validator';

export class CreateSessionDto {
  @IsString()
  name: string;

  @IsString()
  schoolId: string;

  @IsDateString()
  @IsOptional()
  firstTermStart?: string;

  @IsDateString()
  @IsOptional()
  firstTermEnd?: string;

  @IsDateString()
  @IsOptional()
  secondTermStart?: string;

  @IsDateString()
  @IsOptional()
  secondTermEnd?: string;

  @IsDateString()
  @IsOptional()
  thirdTermStart?: string;

  @IsDateString()
  @IsOptional()
  thirdTermEnd?: string;

  @IsBoolean()
  @IsOptional()
  isActive?: boolean;
}

export class UpdateSessionDto {
  @IsString()
  @IsOptional()
  name?: string;

  @IsDateString()
  @IsOptional()
  firstTermStart?: string;

  @IsDateString()
  @IsOptional()
  firstTermEnd?: string;

  @IsDateString()
  @IsOptional()
  secondTermStart?: string;

  @IsDateString()
  @IsOptional()
  secondTermEnd?: string;

  @IsDateString()
  @IsOptional()
  thirdTermStart?: string;

  @IsDateString()
  @IsOptional()
  thirdTermEnd?: string;

  @IsBoolean()
  @IsOptional()
  isActive?: boolean;
}
