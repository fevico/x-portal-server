import {
  IsOptional,
  IsString,
  IsBooleanString,
  IsInt,
  Min,
  IsBoolean,
  IsNotEmpty,
  IsNumber,
  IsObject,
  IsEmail,
} from 'class-validator';
import { Transform } from 'class-transformer';

export class CreateSubscriptionPackageDto {
  @IsNotEmpty()
  @IsString()
  name: string;

  @IsNotEmpty()
  @IsString()
  description: string;

  @IsNotEmpty()
  @IsNumber()
  @Min(0)
  amount: number;

  @IsNotEmpty()
  @IsInt()
  @Min(1)
  duration: number; // in months

  @IsNotEmpty()
  @IsInt()
  @Min(1)
  studentLimit: number;

  @IsOptional()
  @IsObject()
  features?: any; // JSON object for features

  @IsOptional()
  @IsBoolean()
  isActive?: boolean = true;
}

export class UpdateSubscriptionPackageDto {
  @IsOptional()
  @IsString()
  name?: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsOptional()
  @IsNumber()
  @Min(0)
  amount?: number;

  @IsOptional()
  @IsInt()
  @Min(1)
  duration?: number;

  @IsOptional()
  @IsInt()
  @Min(1)
  studentLimit?: number;

  @IsOptional()
  @IsObject()
  features?: any;

  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}

export class GetSubscriptionPackagesDto {
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

export class SubscribeSchoolDto {
  @IsNotEmpty()
  @IsString()
  packageId: string;

  @IsNotEmpty()
  @IsEmail()
  email: string;

  @IsOptional()
  @IsString()
  paymentMethod?: string = 'online'; // 'online' or 'offline'

  @IsOptional()
  @IsObject()
  metadata?: any;
}

export class ExtendSubscriptionDto {
  @IsNotEmpty()
  @IsString()
  packageId: string;

  @IsNotEmpty()
  @IsEmail()
  email: string;

  @IsOptional()
  @IsInt()
  @Min(1)
  additionalMonths?: number = 1; // For extending with different duration

  @IsOptional()
  @IsObject()
  metadata?: any;
}

export class AssignSubscriptionDto {
  @IsNotEmpty()
  @IsString()
  schoolId: string;

  @IsNotEmpty()
  @IsString()
  packageId: string;

  @IsOptional()
  @IsString()
  paymentMethod?: string = 'offline';

  @IsOptional()
  @IsString()
  paymentReference?: string;

  @IsOptional()
  @IsObject()
  metadata?: any;
}

// Legacy DTOs for backward compatibility
export class GetSubscriptionsDto extends GetSubscriptionPackagesDto {}
export class UpdateSubscriptionDto extends UpdateSubscriptionPackageDto {}
