import { IsNotEmpty, IsNumber, IsOptional, IsString } from "class-validator";

export class InvoiceDto {
    @IsString()
    @IsNotEmpty()
    title: string;

    @IsString()
    @IsNotEmpty()
    description: string;

    @IsNumber()
    @IsNotEmpty()
    amount: number;

    @IsString()
    @IsNotEmpty()
    classId: string;

    @IsString()
    @IsOptional()
    studentId?: string;

    @IsString()
    @IsOptional()
    classArmId?: string;
}