import { AssessmentType, BehavioralRating } from '@prisma/client';

// Separate interface for additional student data
export interface StudentAdditionalData {
  studentId: string;

  // Behavioral ratings (optional)
  punctuality?: BehavioralRating;
  attentiveness?: BehavioralRating;
  leadershipSkills?: BehavioralRating;
  neatness?: BehavioralRating;

  // Attendance data (optional)
  attendanceTotal?: number;
  attendancePresent?: number;
  attendanceAbsent?: number;

  // Comments (optional)
  classTeacherComment?: string;
  principalComment?: string;
}

// Individual score entry interface (kept simple)
export interface ScoreEntry {
  studentId: string;
  componentId: string; // markingSchemeComponentId or continuousAssessmentComponentId
  subComponentId?: string; // For CA sub-components
  parentComponentId?: string; // For grouping CA components
  score: number;
  maxScore: number;
  type: AssessmentType;
}

// Main DTO for saving scores (now with separate additional data)
export interface SaveScoresDto {
  sessionId: string;
  classId: string;
  classArmId: string;
  termId: string; // termDefinitionId
  subjectId: string;
  scores: ScoreEntry[];
  additionalData?: StudentAdditionalData[]; // New optional field
}

// Response interface for fetched scores (without additional data)
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

// Additional data response interface (separate from scores)
export interface AdditionalStudentData {
  studentId: string;
  // Behavioral ratings
  punctuality?: BehavioralRating;
  attentiveness?: BehavioralRating;
  leadershipSkills?: BehavioralRating;
  neatness?: BehavioralRating;

  // Attendance data
  attendanceTotal?: number;
  attendancePresent?: number;
  attendanceAbsent?: number;

  // Comments
  classTeacherComment?: string;
  principalComment?: string;
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
