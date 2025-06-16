// DTOs
export interface SaveStudentScoresDto {
  studentId: string;
  subjectId: string;
  classId: string;
  classArmId: string;
  sessionId: string;
  termDefinitionId: string;
  schoolId: string;
  scores: Array<{
    markingSchemeComponentId?: string;
    continuousAssessmentComponentId?: string;
    score: number;
  }>;
  recordedBy: string;
}

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
  schoolId: string; // Always required for security
}
