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
  invoiceType: 'single' | 'mass';
  @IsString()
  @IsNotEmpty()
  title: string;

  @IsString()
  @IsNotEmpty()
  description: string;

  @IsNumber()
  @IsNotEmpty()
  amount: number;

  @IsArray()
  @ArrayNotEmpty()
  @IsString({ each: true })
  classIds: string[];

  @ValidateIf((o) => o.invoiceType === 'single')
  @IsString()
  @IsNotEmpty()
  classArmId?: string;

  @IsString()
  @IsNotEmpty()
  sessionId: string;

  @IsString()
  @IsNotEmpty()
  termId: string;

  @ValidateIf((o) => o.invoiceType === 'single')
  @IsString()
  @IsOptional()
  studentId?: string;
}

export class UpdateInvoiceDto {
  @IsString()
  @IsOptional()
  @IsIn(['single', 'mass'])
  invoiceType?: 'single' | 'mass';
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

  @ValidateIf((o) => o.invoiceType === 'single')
  @IsString()
  @IsOptional()
  classId?: string;

  @ValidateIf((o) => o.invoiceType === 'mass')
  @IsArray()
  @IsOptional()
  @IsString({ each: true })
  classIds?: string[];

  @ValidateIf((o) => o.invoiceType === 'single')
  @IsString()
  @IsOptional()
  studentId?: string;

  @ValidateIf((o) => o.invoiceType === 'single')
  @IsString()
  @IsOptional()
  classArmId?: string;
}
