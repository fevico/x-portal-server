import { IsEmail, IsString } from "class-validator";

export class CreateAuthDto {
    @IsEmail()
    email: string;

    @IsString()
    password: string;

    @IsString()
    name: string;

    @IsString()
    phone: string;

    @IsString()
    address: string;
 
    @IsString()
    city: string;

    @IsString()
    country: string;

    @IsString()
    postalCode: string;

    @IsString()
    role: string;
}
