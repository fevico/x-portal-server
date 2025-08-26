import { IsString, IsNotEmpty, IsOptional, IsDateString, IsEnum, IsBoolean, IsInt, IsNumber, Min, Max, IsArray } from 'class-validator';
import { QuestionType } from '@prisma/client';

export class CreateExamDto {
    @IsString()
    @IsNotEmpty()
    name: string;

    @IsString()
    @IsOptional()
    description?: string;

    @IsDateString()
    @IsNotEmpty()
    startDate: string;

    @IsDateString()
    @IsNotEmpty()
    endDate: string;

    @IsString()
    @IsNotEmpty()
    sessionId: string;

    @IsString()
    @IsNotEmpty()
    termDefinitionId: string;

    @IsString()
    @IsNotEmpty()
    classId: string;

    @IsString()
    @IsNotEmpty()
    markingSchemeComponentId?: string;

    @IsString()
    @IsOptional()
    subComponentId?: string;
}

export class CreatePaperDto {
    @IsString()
    @IsNotEmpty()
    examId: string;

    @IsString()
    @IsNotEmpty()
    subjectId: string;

    @IsInt()
    @IsNotEmpty()
    @Min(1)
    duration: number;

    @IsInt()
    @IsOptional()
    @Min(1)
    maxRetries?: number;

    @IsBoolean()
    @IsOptional()
    randomizeQuestions?: boolean;

    @IsBoolean()
    @IsOptional()
    showResult?: boolean;

    @IsBoolean()
    @IsOptional()
    showCorrections?: boolean;

    @IsArray()
    @IsNotEmpty()
    questionIds: string[];
}

export class CreateQuestionDto {
    @IsString()
    @IsNotEmpty()
    content: string;

    @IsEnum(QuestionType)
    @IsNotEmpty()
    type: QuestionType;

    @IsArray()
    @IsOptional()
    options?: string[];

    @IsString()
    @IsNotEmpty()
    correctAnswer: string;

    @IsString()
    @IsOptional()
    explanation?: string;

    @IsInt()
    @IsOptional()
    @Min(1)
    @Max(5)
    difficultyLevel?: number;

    @IsString()
    @IsNotEmpty()
    subjectId: string;

    @IsArray()
    @IsOptional()
    topicTags?: string[];
}

export class SubmitAnswerDto {
    @IsString()
    @IsNotEmpty()
    paperId: string;

    @IsString()
    @IsNotEmpty()
    studentId: string;

    @IsNumber()
    @IsNotEmpty()
    attempt: number;

    // Structure: { questionId: string, answer: string }[]
    @IsArray()
    @IsNotEmpty()
    answers: { questionId: string; answer: string }[];
}

export class GradeEssayDto {
    @IsString()
    @IsNotEmpty()
    responseId: string;

    @IsNumber()
    @IsNotEmpty()
    @Min(0)
    score: number;

    @IsString()
    @IsOptional()
    comment?: string;
}
