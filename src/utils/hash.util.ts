// Create this in src/utils/hash.util.ts
import { createHash } from 'crypto';

export function generateScoreUniqueHash({
  schoolId,
  studentId,
  subjectId,
  sessionId,
  termDefinitionId,
  markingSchemeComponentId,
  continuousAssessmentComponentId,
}: {
  schoolId: string;
  studentId: string;
  subjectId: string;
  sessionId: string;
  termDefinitionId: string;
  markingSchemeComponentId?: string;
  continuousAssessmentComponentId?: string;
}): string {
  const combined = [
    schoolId,
    studentId,
    subjectId,
    sessionId,
    termDefinitionId,
    markingSchemeComponentId || 'null',
    continuousAssessmentComponentId || 'null',
  ].join('-');

  return createHash('sha256').update(combined).digest('hex').substring(0, 64);
}
// @@unique([sessionId, termId, classId, classArmId, resultTypeId, resultScope, schoolId])

export function generateResultBatchUniqueHash({
  sessionId,
  termId,
  classId,
  classArmId,
  resultTypeId,
  resultScope,
  schoolId,
}: {
  termId: string;
  classId: string;
  classArmId: string;
  resultTypeId: string;
  resultScope: string;
  sessionId: string;
  schoolId: string;
}): string {
  const combined = [
    sessionId,
    termId,
    classId,
    classArmId,
    resultTypeId,
    resultScope,
    schoolId,
  ].join('-');

  return createHash('sha256').update(combined).digest('hex').substring(0, 64);
}

export function generateStudentTermRecordUniqueHash({
  studentId,
  classId,
  classArmId,
  sessionId,
  termDefinitionId,
  schoolId,
}: {
  studentId: string;
  classId: string;
  classArmId: string;
  sessionId: string;
  termDefinitionId: string;
  schoolId: string;
}): string {
  const combined = [
    studentId,
    classId,
    classArmId,
    sessionId,
    termDefinitionId,
    schoolId,
  ].join('-');

  return createHash('sha256').update(combined).digest('hex').substring(0, 64);
}
