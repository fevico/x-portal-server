import {
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
  IsArray,
  IsIn,
  ValidateIf,
  ArrayNotEmpty,
} from 'class-validator';

export class InvoiceDto {
  @IsString()
  @IsNotEmpty()
  @IsIn(['single', 'mass'])
  type: 'single' | 'mass';
  @IsString()
  @IsNotEmpty()
  title: string;

  @IsString()
  @IsNotEmpty()
  description: string;

  @IsNumber()
  @IsNotEmpty()
  amount: number;

  @ValidateIf((o) => o.type === 'single')
  @IsString()
  @IsNotEmpty()
  classId?: string;

  @ValidateIf((o) => o.type === 'mass')
  @IsArray()
  @ArrayNotEmpty()
  @IsString({ each: true })
  classIds?: string[];

  @IsString()
  @IsNotEmpty()
  sessionId: string;

  @IsString()
  @IsNotEmpty()
  termId: string;

  @ValidateIf((o) => o.type === 'single')
  @IsString()
  @IsOptional()
  studentId?: string;

  @ValidateIf((o) => o.type === 'single')
  @IsString()
  @IsOptional()
  classArmId?: string;

  @ValidateIf((o) => o.type === 'mass')
  @IsArray()
  @IsOptional()
  @IsString({ each: true })
  classArmIds?: string[];
}

export class UpdateInvoiceDto {
  @IsString()
  @IsOptional()
  @IsIn(['single', 'mass'])
  type?: 'single' | 'mass';
  @IsString()
  @IsOptional()
  title?: string;

  @IsString()
  @IsOptional()
  description?: string;

  @IsString()
  @IsOptional()
  termId?: string;

  @IsNumber()
  @IsOptional()
  amount?: number;

  @ValidateIf((o) => o.type === 'single')
  @IsString()
  @IsOptional()
  classId?: string;

  @ValidateIf((o) => o.type === 'mass')
  @IsArray()
  @IsOptional()
  @IsString({ each: true })
  classIds?: string[];

  @ValidateIf((o) => o.type === 'single')
  @IsString()
  @IsOptional()
  studentId?: string;

  @ValidateIf((o) => o.type === 'single')
  @IsString()
  @IsOptional()
  classArmId?: string;

  @ValidateIf((o) => o.type === 'mass')
  @IsArray()
  @IsOptional()
  @IsString({ each: true })
  classArmIds?: string[];
}
