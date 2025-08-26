import { IsDate, IsNotEmpty, IsOptional, IsString } from "class-validator";

export class CreateLessonPlan {
    @IsNotEmpty()
    @IsString()
    subjectId:  string

    @IsNotEmpty()
    @IsString()
    classId: string

    @IsNotEmpty()
    @IsString()
    classArmId: string

    @IsString()
    @IsNotEmpty()
    sessionId: string

    @IsString()
    @IsNotEmpty()
    termId: string

    @IsString()
    @IsNotEmpty()
    weekId: string

    @IsString()
    @IsNotEmpty()
    topic: string

    @IsString()
    @IsNotEmpty()
    subTopic: string

    @IsString()
    @IsOptional()
    period: string

    @IsString()
    @IsOptional()
    duration: string

    @IsString()
    step: string

    @IsString()
    teacherActivity: string 
}