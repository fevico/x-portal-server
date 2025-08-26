import {
  IsBoolean,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
} from 'class-validator';

export class RecordOfflinePaymentDto {
  @IsString()
  @IsNotEmpty()
  studentId: string;

  @IsString()
  @IsNotEmpty()
  invoiceId: string;

  @IsNumber()
  @IsNotEmpty()
  amount: number;

  @IsNotEmpty()
  proofOfPayment: any; // We'll handle this as JSON like in admissions
}

export class ProcessOfflinePaymentDto {
  @IsBoolean()
  @IsOptional()
  approve?: boolean = true;

  @IsString()
  @IsOptional()
  rejectionReason?: string;
}
