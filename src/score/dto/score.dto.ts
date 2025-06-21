import { AssessmentType } from '@prisma/client';

// Individual score entry interface
export interface ScoreEntry {
  studentId: string;
  componentId: string; // markingSchemeComponentId or continuousAssessmentComponentId
  subComponentId?: string; // For CA sub-components
  parentComponentId?: string; // For grouping CA components
  score: number;
  maxScore: number;
  type: AssessmentType;
}

// Main DTO for saving scores
export interface SaveScoresDto {
  sessionId: string;
  classId: string;
  classArmId: string;
  termId: string; // termDefinitionId
  subjectId: string;
  scores: ScoreEntry[];
}

// Response interface for fetched scores
export interface StudentScore {
  id: string;
  studentId: string;
  subjectId: string;
  componentId: string;
  subComponentId?: string;
  score: number;
  maxScore: number;
  type: 'CA' | 'EXAM';
  student?: {
    id: string;
    regNo: string;
    fullName: string;
  };
  subject?: {
    id: string;
    name: string;
    code: string;
  };
}

// DTO for fetching scores
// export interface FetchScoresDto {
//   sessionId: string;
//   classId: string;
//   classArmId: string;
//   termId: string;
//   subjectId?: string; // Optional - if not provided, fetch for all subjects
// }

export interface FetchStudentScoresDto {
  studentId: string;
  subjectId: string;
  sessionId: string;
  termDefinitionId: string;
  schoolId: string;
}

export interface FetchStudentResultDto {
  studentId: string;
  subjectId: string;
  sessionId: string;
  termDefinitionId: string;
  schoolId: string;
}

export interface FetchClassArmResultsDto {
  classArmId: string;
  sessionId: string;
  termDefinitionId: string;
  schoolId: string;
}

export interface FetchScoresDto {
  sessionId?: string;
  classId?: string;
  classArmId?: string;
  termId?: string; // This will map to termDefinitionId
  subjectId?: string;
  studentId?: string;
  // schoolId: string; // Always required for security
}
