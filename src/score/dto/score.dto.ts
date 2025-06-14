// DTOs
export interface SaveStudentScoresDto {
  studentId: string;
  subjectId: string;
  classId: string;
  classArmId: string;
  sessionId: string;
  sessionTermId: string;
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
  sessionTermId: string;
  schoolId: string;
}

export interface FetchStudentResultDto {
  studentId: string;
  subjectId: string;
  sessionId: string;
  sessionTermId: string;
  schoolId: string;
}

export interface FetchClassArmResultsDto {
  classArmId: string;
  sessionId: string;
  sessionTermId: string;
  schoolId: string;
}
