import { AssessmentType, BehavioralRating } from '@prisma/client';
import { IsEnum, IsOptional, IsString } from 'class-validator';

export class GetResultsQueryDto {
  @IsString()
  @IsOptional()
  q?: string;

  @IsString()
  @IsOptional()
  page?: string;

  @IsString()
  @IsOptional()
  limit?: string;

  @IsString()
  @IsOptional()
  all?: boolean;

  @IsString()
  @IsOptional()
  type?: AssessmentType;
}

export class computeResultsDto {
  @IsString()
  sessionId: string;

  @IsString()
  termId: string;

  @IsString()
  classId: string;

  @IsString()
  classArmId: string;

  @IsString()
  resultScope: AssessmentType;

  @IsString()
  resultTypeId: string;
}

// Enhanced DTOs for the new result structure
export interface StudentBehavioralDataDto {
  punctuality?: BehavioralRating;
  attentiveness?: BehavioralRating;
  leadershipSkills?: BehavioralRating;
  neatness?: BehavioralRating;
}

export interface StudentAttendanceDataDto {
  total: number;
  present: number;
  absent: number;
  percentage: number;
}

export interface StudentCommentsDto {
  classTeacher: string;
  principal: string;
}

export interface SubjectResultDto {
  subject: {
    id: string;
    name: string;
    code: string;
  };
  totalScore: number;
  obtainableScore: number;
  position: number | null;
  grade: {
    id: string;
    name: string;
    scoreStartPoint: number;
    scoreEndPoint: number;
    remark: string;
  } | null;
  comment: string;
  componentScores: any;
  percentage: number;
}

export interface StudentResultDto {
  id: string;
  studentRegNo: string;
  user: {
    id: string;
    firstname: string;
    lastname: string;
    othername?: string;
    username: string;
    gender?: string;
    avatar?: any;
  };
  dateOfBirth?: Date;
  age?: number;
  subjects: SubjectResultDto[];
  totalScore: number;
  totalObtainable: number;
  averageScore: number;
  overallPercentage: number;
  overallPosition: number;
  behavioralData: StudentBehavioralDataDto;
  attendanceData: StudentAttendanceDataDto;
  comments: StudentCommentsDto;
}

export interface ClassStatsDto {
  totalStudents: number;
  totalSubjects: number;
  totalObtainableScore: number;
  totalObtainedScore: number;
  classPercentage: number;
  highestScore: number;
  lowestScore: number;
  classAverage: number;
  attendance: {
    totalDays: number;
    totalPresent: number;
    totalAbsent: number;
    attendancePercentage: number;
  };
  subjectStats: {
    subject: {
      id: string;
      name: string;
      code: string;
    };
    highest: number;
    lowest: number;
    average: number;
    totalStudents: number;
  }[];
}

export interface ResultBatchDetailsDto {
  resultBatch: {
    id: string;
    title: string;
    resultScope: AssessmentType;
    isApproved: boolean;
    approvedBy?: string;
    approvedAt?: Date;
    createdAt: Date;
    updatedAt: Date;
    session: {
      id: string;
      name: string;
    };
    termDefinition: {
      id: string;
      name: string;
      displayName: string;
    };
    class: {
      id: string;
      name: string;
    };
    classArm: {
      id: string;
      name: string;
    };
    resultType: {
      id: string;
      name: string;
    };
  };
  markingSchemeStructure: any;
  students: StudentResultDto[];
  subjects: {
    id: string;
    name: string;
    code: string;
  }[];
  classStats: ClassStatsDto;
  metadata: {
    generatedAt: Date;
    totalRecords: number;
    hasStudentTermRecords: boolean;
    gradingSystemId: string | null;
  };
}

export class GetResultByTypeParamsDto {
  @IsString()
  id: string;

  @IsEnum(['grades', 'scores'], {
    message: 'Type must be either "grades" or "scores"',
  })
  type: 'grades' | 'scores';
}

export class GetStudentTranscriptDto {
  @IsString()
  classCategoryId: string;

  @IsString()
  studentIdentifier: string; // Can be full name or registration number
}

export class GetStudentsForPromotionDto {
  @IsString()
  sessionId: string;

  @IsString()
  classId: string;

  @IsString()
  classArmId: string;
}

export class StudentPromotionDataDto {
  @IsString()
  studentId: string;

  @IsString()
  promoteAction: boolean; // true = promote, false = retain
}

export class PromoteStudentsDto {
  @IsString()
  newSessionId: string;

  @IsString()
  newClassId: string;

  @IsString()
  newClassArmId: string;

  @IsString()
  currentSessionId: string;

  @IsString()
  currentClassId: string;

  @IsString()
  currentClassArmId: string;

  @IsOptional()
  graduatingClass?: boolean = false;

  @IsString({ each: true })
  studentPromotions: StudentPromotionDataDto[];
}
