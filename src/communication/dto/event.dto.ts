import { IsDateString, IsNotEmpty, IsOptional, IsString } from "class-validator";

export class CreateEvent {
     @IsString()
    @IsNotEmpty()
    name: string;
    
    @IsString()
    @IsNotEmpty()
    eventColor: string;

    @IsString()
    @IsNotEmpty()
    eventDescription: string;
    
    @IsDateString()
    @IsNotEmpty()
    startDate: Date;
    
    @IsDateString()
    @IsNotEmpty()
    endDate: Date;
                                
}
export class updateEvent {
     @IsString()
    @IsNotEmpty()
    name: string;
    
    @IsString()
    @IsNotEmpty()
    eventColor: string;

    @IsString()
    @IsNotEmpty()
    eventDescription: string;
    
    @IsDateString()
    @IsNotEmpty()
    startDate: Date;
    
    @IsDateString()
    @IsNotEmpty()
    endDate: Date;
                                
}