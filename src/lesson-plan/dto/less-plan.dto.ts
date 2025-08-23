import { IsDate, IsNotEmpty, IsString } from "class-validator";

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

    @IsDate()
    date: Date

    @IsString()
    @IsNotEmpty()
    topic: string

    @IsString()
    @IsNotEmpty()
    subTopic: string

    @IsString()
    @IsNotEmpty()
    period: string

    @IsString()
    @IsNotEmpty()
    duration: string

    @IsString()
    step: string

    @IsString()
    teacherActivity: string 
}