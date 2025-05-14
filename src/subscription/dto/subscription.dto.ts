import {
  IsOptional,
  IsString,
  IsBooleanString,
  IsInt,
  Min,
  IsBoolean,
} from 'class-validator';
import { Transform } from 'class-transformer';

export class GetSubscriptionsDto {
  @IsOptional()
  @IsString()
  search?: string;

  @IsOptional()
  @IsBooleanString()
  isActive?: string;

  @IsOptional()
  @IsInt()
  @Min(1)
  @Transform(({ value }) => parseInt(value, 10))
  page?: number = 1;

  @IsOptional()
  @IsInt()
  @Min(1)
  @Transform(({ value }) => parseInt(value, 10))
  limit?: number = 10;
}

export class UpdateSubscriptionDto {
  @IsOptional()
  @IsString()
  name?: string;

  @IsOptional()
  @IsInt()
  @Min(1)
  duration?: number;

  @IsOptional()
  @IsInt()
  @Min(0)
  student_limit?: number;

  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
  studentLimit: any;
}
