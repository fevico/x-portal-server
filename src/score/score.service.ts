import {
  Injectable,
  HttpException,
  HttpStatus,
  BadRequestException,
  NotFoundException,
} from '@nestjs/common';
import {
  SaveScoresDto,
  FetchScoresDto,
  StudentScore,
  StudentAdditionalData,
} from './dto/score.dto';
import { PrismaService } from '@/prisma/prisma.service';
import { LoggingService } from '@/log/logging.service';
import { AuthenticatedUser } from '@/types/express';
import { AssessmentType } from '@prisma/client';
import {
  generateScoreUniqueHash,
  generateStudentTermRecordUniqueHash,
} from '@/utils/hash.util';

@Injectable()
export class ScoreService {
  constructor(
    private prisma: PrismaService,
    private loggingService: LoggingService,
  ) {}

  /**
   * Helper method to compute attendance record for a student in a class/session/term
   */
  private async computeAttendanceRecord(
    studentId: string,
    classId: string,
    classArmId: string,
    sessionId: string,
    termDefinitionId: string,
    schoolId: string,
  ): Promise<{ total: number; present: number; absent: number }> {
    try {
      // First, find the SessionTerm that corresponds to the termDefinitionId
      const sessionTerm = await this.prisma.sessionTerm.findFirst({
        where: {
          sessionId,
          termDefinitionId,
          schoolId,
        },
      });

      if (!sessionTerm) {
        console.warn(
          `No SessionTerm found for termDefinitionId: ${termDefinitionId}, sessionId: ${sessionId}`,
        );
        return { total: 0, present: 0, absent: 0 };
      }

      // Get all attendance records for the student in the specified context
      const attendanceRecords = await this.prisma.attendance.findMany({
        where: {
          studentId,
          classId,
          classArmId,
          sessionId,
          termId: sessionTerm.id, // Use SessionTerm id, not termDefinitionId
          schoolId,
        },
        select: {
          status: true,
        },
      });

      const total = attendanceRecords.length;
      const present = attendanceRecords.filter(
        (record) => record.status === 'present' || record.status === 'late',
      ).length;
      const absent = attendanceRecords.filter(
        (record) => record.status === 'absent',
      ).length;

      return { total, present, absent };
    } catch (error) {
      console.error('Error computing attendance record:', error);
      // Return default values if computation fails
      return { total: 0, present: 0, absent: 0 };
    }
  }

  /**
   * Helper method to create or update StudentTermRecord
   */
  private async upsertStudentTermRecord(
    studentId: string,
    classId: string,
    classArmId: string,
    sessionId: string,
    termDefinitionId: string,
    schoolId: string,
    additionalData: any,
    recordedBy: string,
    tx: any,
  ): Promise<void> {
    const uniqueHash = generateStudentTermRecordUniqueHash({
      studentId,
      classId,
      classArmId,
      sessionId,
      termDefinitionId,
      schoolId,
    });

    // Check if record already exists
    const existingRecord = await tx.studentTermRecord.findFirst({
      where: { uniqueHash },
    });

    const recordData = {
      studentId,
      classId,
      classArmId,
      sessionId,
      termDefinitionId,
      schoolId,
      uniqueHash,
      recordedBy,
      // Behavioral ratings
      punctuality: additionalData?.punctuality || null,
      attentiveness: additionalData?.attentiveness || null,
      leadershipSkills: additionalData?.leadershipSkills || null,
      neatness: additionalData?.neatness || null,
      // Attendance data
      attendanceTotal: additionalData?.attendanceTotal,
      attendancePresent: additionalData?.attendancePresent,
      attendanceAbsent: additionalData?.attendanceAbsent,
      // Comments
      classTeacherComment: additionalData?.classTeacherComment || null,
      principalComment: additionalData?.principalComment || null,
    };

    if (existingRecord) {
      // Update existing record
      await tx.studentTermRecord.update({
        where: { id: existingRecord.id },
        data: {
          ...recordData,
          updatedBy: recordedBy,
          updatedAt: new Date(),
        },
      });
    } else {
      // Create new record
      await tx.studentTermRecord.create({
        data: {
          ...recordData,
          createdBy: recordedBy,
        },
      });
    }
  }

  async saveScores(data: SaveScoresDto, req: any) {
    try {
      const user = req.user as AuthenticatedUser;
      const schoolId = user.schoolId;

      // Validate school association
      if (!schoolId) {
        throw new BadRequestException('User must be associated with a school');
      }

      // Move all validations OUTSIDE the transaction to reduce transaction time
      const [session, termDefinition, classExists, classArmExists, subject] =
        await Promise.all([
          // Validate session
          this.prisma.session.findFirst({
            where: { id: data.sessionId, schoolId, isDeleted: false },
          }),
          // Validate term
          this.prisma.termDefinition.findFirst({
            where: { id: data.termId, schoolId },
          }),
          // Validate class
          this.prisma.class.findFirst({
            where: { id: data.classId, schoolId, isDeleted: false },
          }),
          // Validate class arm
          this.prisma.classArm.findFirst({
            where: { id: data.classArmId, schoolId, isDeleted: false },
          }),
          // Validate subject
          this.prisma.subject.findFirst({
            where: { id: data.subjectId, schoolId, isDeleted: false },
          }),
        ]);

      // Throw errors if any validation fails
      if (!session)
        throw new NotFoundException('Session not found for this school');
      if (!termDefinition)
        throw new NotFoundException('Term not found for this school');
      if (!classExists)
        throw new NotFoundException('Class not found for this school');
      if (!classArmExists)
        throw new NotFoundException('Class arm not found for this school');
      if (!subject)
        throw new NotFoundException('Subject not found for this school');

      // Pre-validate all students in one query
      const studentIds = [
        ...new Set(data.scores.map((score) => score.studentId)),
      ];
      const validStudentAssignments =
        await this.prisma.studentClassAssignment.findMany({
          where: {
            studentId: { in: studentIds },
            sessionId: data.sessionId,
            classId: data.classId,
            classArmId: data.classArmId,
            schoolId,
            isActive: true,
          },
          select: { studentId: true },
        });

      const validStudentIds = new Set(
        validStudentAssignments.map((sa) => sa.studentId),
      );

      // Pre-validate continuous assessment components if needed
      const caComponentIds = data.scores
        .filter((score) => score.subComponentId)
        .map((score) => score.subComponentId!);

      const caComponentsMap = new Map();
      if (caComponentIds.length > 0) {
        const caComponents =
          await this.prisma.continuousAssessmentComponent.findMany({
            where: {
              id: { in: caComponentIds },
              schoolId,
            },
            include: {
              continuousAssessment: {
                select: { markingSchemeComponentId: true },
              },
            },
          });

        caComponents.forEach((comp) => {
          caComponentsMap.set(comp.id, comp);
        });
      }

      // Prepare all score operations with hashes
      const scoreOperations = [];
      const errors = [];

      // Create a map of additional data by studentId for quick lookup
      const additionalDataMap = new Map();
      if (data.additionalData) {
        data.additionalData.forEach((additionalData) => {
          additionalDataMap.set(additionalData.studentId, additionalData);
        });
      }

      for (const scoreEntry of data.scores) {
        // Validate student assignment
        if (!validStudentIds.has(scoreEntry.studentId)) {
          errors.push(
            `Student ${scoreEntry.studentId} is not assigned to this class`,
          );
          continue;
        }

        // Get additional data for this student
        const studentAdditionalData = additionalDataMap.get(
          scoreEntry.studentId,
        );

        // Determine component IDs
        let markingSchemeComponentId: string | null = null;
        let continuousAssessmentComponentId: string | null = null;

        if (scoreEntry.type === AssessmentType.EXAM) {
          markingSchemeComponentId = scoreEntry.componentId;
        } else if (scoreEntry.type === AssessmentType.CA) {
          if (scoreEntry.subComponentId) {
            const caComponent = caComponentsMap.get(scoreEntry.subComponentId);
            if (!caComponent) {
              errors.push(
                `Continuous assessment component ${scoreEntry.subComponentId} not found`,
              );
              continue;
            }
            continuousAssessmentComponentId = scoreEntry.subComponentId;
            markingSchemeComponentId =
              caComponent.continuousAssessment.markingSchemeComponentId;
          } else {
            markingSchemeComponentId = scoreEntry.componentId;
          }
        }

        const uniqueHash = generateScoreUniqueHash({
          schoolId,
          studentId: scoreEntry.studentId,
          subjectId: data.subjectId,
          sessionId: data.sessionId,
          termDefinitionId: data.termId,
          markingSchemeComponentId: scoreEntry.componentId,
          continuousAssessmentComponentId: scoreEntry.subComponentId,
        });

        scoreOperations.push({
          uniqueHash,
          scoreEntry,
          studentAdditionalData,
          markingSchemeComponentId,
          continuousAssessmentComponentId,
        });
      }

      // Check for existing scores in batch
      const existingHashes = scoreOperations.map((op) => op.uniqueHash);
      const existingScores = await this.prisma.studentScoreAssignment.findMany({
        where: { uniqueHash: { in: existingHashes } },
        select: { id: true, uniqueHash: true },
      });

      const existingScoresMap = new Map();
      existingScores.forEach((score) => {
        existingScoresMap.set(score.uniqueHash, score);
      });

      // Process scores in transaction with increased timeout
      const result = await this.prisma.$transaction(
        async (tx) => {
          const processedScores = [];

          // Batch operations: separate updates and creates
          const updateOperations = [];
          const createOperations = [];

          for (const operation of scoreOperations) {
            const {
              uniqueHash,
              scoreEntry,
              studentAdditionalData,
              markingSchemeComponentId,
              continuousAssessmentComponentId,
            } = operation;

            const scoreData = {
              studentId: scoreEntry.studentId,
              subjectId: data.subjectId,
              classId: data.classId,
              classArmId: data.classArmId,
              sessionId: data.sessionId,
              termDefinitionId: data.termId,
              markingSchemeComponentId,
              continuousAssessmentComponentId,
              score: scoreEntry.score,
              recordedBy: user.id,
              schoolId,
              uniqueHash,
              updatedBy: user.id,
            };

            // Handle StudentTermRecord separately if additional data exists
            if (studentAdditionalData) {
              // Compute attendance if not provided
              if (
                studentAdditionalData.attendanceTotal === undefined ||
                studentAdditionalData.attendancePresent === undefined ||
                studentAdditionalData.attendanceAbsent === undefined
              ) {
                const attendance = await this.computeAttendanceRecord(
                  scoreEntry.studentId,
                  data.classId,
                  data.classArmId,
                  data.sessionId,
                  data.termId,
                  schoolId,
                );
                studentAdditionalData.attendanceTotal =
                  studentAdditionalData.attendanceTotal ?? attendance.total;
                studentAdditionalData.attendancePresent =
                  studentAdditionalData.attendancePresent ?? attendance.present;
                studentAdditionalData.attendanceAbsent =
                  studentAdditionalData.attendanceAbsent ?? attendance.absent;
              }

              // Create or update StudentTermRecord
              await this.upsertStudentTermRecord(
                scoreEntry.studentId,
                data.classId,
                data.classArmId,
                data.sessionId,
                data.termId,
                schoolId,
                studentAdditionalData,
                user.id,
                tx,
              );
            }

            const existingScore = existingScoresMap.get(uniqueHash);

            if (existingScore) {
              updateOperations.push({
                where: { id: existingScore.id },
                data: { ...scoreData, updatedAt: new Date() },
                scoreEntry,
              });
            } else {
              createOperations.push({
                data: { ...scoreData, createdBy: user.id },
                scoreEntry,
              });
            }
          }

          // Execute batch updates
          for (const updateOp of updateOperations) {
            const updatedScore = await tx.studentScoreAssignment.update({
              where: updateOp.where,
              data: updateOp.data, // Only pass data, not the entire updateOp
            });
            processedScores.push({
              id: updatedScore.id,
              studentId: updateOp.scoreEntry.studentId,
              componentId: updateOp.scoreEntry.componentId,
              score: updateOp.scoreEntry.score,
              action: 'updated',
            });
          }

          // Execute batch creates
          for (const createOp of createOperations) {
            const createdScore = await tx.studentScoreAssignment.create({
              data: createOp.data, // Only pass data, not the entire createOp
            });
            processedScores.push({
              id: createdScore.id,
              studentId: createOp.scoreEntry.studentId,
              componentId: createOp.scoreEntry.componentId,
              score: createOp.scoreEntry.score,
              action: 'created',
            });
          }

          return { processedScores, errors };
        },
        {
          maxWait: 10000, // 10 seconds max wait
          timeout: 15000, // 15 seconds timeout
        },
      );

      // Log the action (outside transaction)
      await this.loggingService.logAction(
        'SAVE_SCORES',
        'StudentScoreAssignment',
        data.subjectId,
        user.id,
        schoolId,
        {
          sessionId: data.sessionId,
          classId: data.classId,
          subjectId: data.subjectId,
          totalScores: data.scores.length,
          processedScores: result.processedScores.length,
          errors: result.errors.length,
        },
        req,
      );

      return {
        statusCode: 200,
        message: 'Scores processed successfully',
        data: {
          session: { id: session.id, name: session.name },
          class: { id: classExists.id, name: classExists.name },
          classArm: { id: classArmExists.id, name: classArmExists.name },
          subject: { id: subject.id, name: subject.name, code: subject.code },
          summary: {
            totalSubmitted: data.scores.length,
            successful: result.processedScores.length,
            failed: result.errors.length,
          },
          processedScores: result.processedScores,
          errors: result.errors,
        },
      };
    } catch (error) {
      if (error instanceof HttpException) {
        throw error;
      }
      console.error('Error saving scores:', error);
      throw new HttpException(
        'Failed to save scores: ' + (error.message || 'Unknown error'),
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  /**
   * Fetch scores for a class arm with optional subject filtering
   * Returns scores grouped by student and component
   */
  async fetchScores(filters: FetchScoresDto, req: any) {
    try {
      const user = req.user as AuthenticatedUser;
      const schoolId = user.schoolId;

      // Validate school association
      if (!schoolId) {
        throw new BadRequestException('User must be associated with a school');
      }

      // Build where clause for score fetching
      const whereClause: any = {
        sessionId: filters.sessionId,
        classId: filters.classId,
        classArmId: filters.classArmId,
        termDefinitionId: filters.termId,
        schoolId,
        isDeleted: false,
      };

      // Add subject filter if provided
      if (filters.subjectId) {
        whereClause.subjectId = filters.subjectId;
      }
      if (filters.studentId) {
        whereClause.studentId = filters.studentId;
      }

      // Fetch scores with related data
      const scores = await this.prisma.studentScoreAssignment.findMany({
        where: whereClause,
        include: {
          student: {
            include: {
              user: {
                select: {
                  id: true,
                  firstname: true,
                  lastname: true,
                  othername: true,
                  username: true,
                },
              },
            },
          },
          subject: {
            select: {
              id: true,
              name: true,
              code: true,
            },
          },
          markingSchemeComponent: {
            select: {
              id: true,
              name: true,
              type: true,
              score: true,
            },
          },
          continuousAssessmentComponent: {
            select: {
              id: true,
              name: true,
              score: true,
            },
          },
        },
        orderBy: [
          { student: { user: { lastname: 'asc' } } },
          { subject: { name: 'asc' } },
          { markingSchemeComponent: { name: 'asc' } },
        ],
      });

      // Transform scores to the required format (without additional data)
      const studentScores: StudentScore[] = scores.map((score) => ({
        id: score.id,
        studentId: score.studentId,
        subjectId: score.subjectId,
        componentId:
          score.markingSchemeComponentId ||
          score.continuousAssessmentComponentId ||
          '',
        subComponentId: score.continuousAssessmentComponentId || undefined,
        score: score.score,
        maxScore:
          score.continuousAssessmentComponent?.score ||
          score.markingSchemeComponent?.score ||
          0,
        type:
          (score.markingSchemeComponent?.type as AssessmentType) ||
          AssessmentType.CA,
        student: {
          id: score.student.id,
          regNo: score.student.studentRegNo || '',
          fullName: `${score.student.user.lastname || ''} ${
            score.student.user.firstname || ''
          } ${score.student.user.othername || ''}`.trim(),
        },
        subject: score.subject,
      }));

      // Fetch additional data from StudentTermRecord separately
      const studentIds = [...new Set(scores.map((score) => score.studentId))];
      const termRecords = await this.prisma.studentTermRecord.findMany({
        where: {
          studentId: { in: studentIds },
          classId: filters.classId,
          classArmId: filters.classArmId,
          sessionId: filters.sessionId,
          termDefinitionId: filters.termId,
          schoolId,
        },
      });

      // Convert term records to additional data format
      const additionalDataArray: StudentAdditionalData[] = termRecords
        .filter(
          (record) =>
            record.punctuality ||
            record.attentiveness ||
            record.leadershipSkills ||
            record.neatness ||
            record.attendanceTotal !== null ||
            record.attendancePresent !== null ||
            record.attendanceAbsent !== null ||
            record.classTeacherComment ||
            record.principalComment,
        )
        .map((record) => ({
          studentId: record.studentId,
          punctuality: record.punctuality,
          attentiveness: record.attentiveness,
          leadershipSkills: record.leadershipSkills,
          neatness: record.neatness,
          attendanceTotal: record.attendanceTotal,
          attendancePresent: record.attendancePresent,
          attendanceAbsent: record.attendanceAbsent,
          classTeacherComment: record.classTeacherComment,
          principalComment: record.principalComment,
        }));

      // Log the action
      await this.loggingService.logAction(
        'FETCH_SCORES',
        'StudentScoreAssignment',
        filters.subjectId || 'ALL_SUBJECTS',
        user.id,
        schoolId,
        {
          filters,
          totalRecords: studentScores.length,
        },
        req,
      );

      const responseData: any = {
        filters,
        totalRecords: studentScores.length,
        scores: studentScores,
      };

      // Only include additionalData if there's actual data
      if (additionalDataArray.length > 0) {
        responseData.additionalData = additionalDataArray;
      }

      return {
        statusCode: 200,
        message: 'Scores retrieved successfully',
        data: responseData,
      };
    } catch (error) {
      if (error instanceof HttpException) {
        throw error;
      }
      console.error('Error fetching scores:', error);
      throw new HttpException(
        'Failed to fetch scores: ' + (error.message || 'Unknown error'),
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  // Fetch scores with flexible filtering (existing method)
  async fetchScoresWithFilters(filters: any, req: any) {
    try {
      const user = req.user;

      // Ensure user has school association
      if (!user.schoolId) {
        throw new Error('User must be associated with a school');
      }

      // Build where clause dynamically based on provided filters
      const whereClause: any = {
        schoolId: user.schoolId,
        isDeleted: false,
      };

      // Add filters conditionally
      if (filters.sessionId) {
        whereClause.sessionId = filters.sessionId;
      }

      if (filters.classId) {
        whereClause.classId = filters.classId;
      }

      if (filters.classArmId) {
        whereClause.classArmId = filters.classArmId;
      }

      if (filters.termId) {
        whereClause.termDefinitionId = filters.termId;
      }

      if (filters.subjectId) {
        whereClause.subjectId = filters.subjectId;
      }

      if (filters.studentId) {
        whereClause.studentId = filters.studentId;
      }

      // Fetch scores with related data
      const scores = await this.prisma.studentScoreAssignment.findMany({
        where: whereClause,
        include: {
          student: {
            include: {
              user: {
                select: {
                  id: true,
                  firstname: true,
                  lastname: true,
                  othername: true,
                  username: true,
                },
              },
            },
          },
          subject: {
            select: {
              id: true,
              name: true,
              code: true,
            },
          },
          class: {
            select: {
              id: true,
              name: true,
            },
          },
          classArm: {
            select: {
              id: true,
              name: true,
            },
          },
          session: {
            select: {
              id: true,
              name: true,
            },
          },
          termDefinition: {
            select: {
              id: true,
              name: true,
            },
          },
          markingSchemeComponent: {
            select: {
              id: true,
              name: true,
              score: true,
              type: true,
            },
          },
          continuousAssessment: {
            select: {
              id: true,
              markingSchemeComponent: {
                select: {
                  id: true,
                  name: true,
                  type: true,
                },
              },
            },
          },
          continuousAssessmentComponent: {
            select: {
              id: true,
              name: true,
              score: true,
            },
          },
        },
        orderBy: [
          { student: { user: { lastname: 'asc' } } },
          { subject: { name: 'asc' } },
          { createdAt: 'desc' },
        ],
      });

      // Build response data
      const responseData: any = {
        filters: {
          sessionId: filters.sessionId || 'all',
          classId: filters.classId || 'all',
          classArmId: filters.classArmId || 'all',
          termId: filters.termId || 'all',
          subjectId: filters.subjectId || 'all',
          studentId: filters.studentId || 'all',
        },
        totalRecords: scores.length,
        scores: scores.map((score) => ({
          id: score.id,
          score: score.score,
          recordedBy: score.recordedBy,
          createdAt: score.createdAt,
          updatedAt: score.updatedAt,
          student: {
            id: score.student.id,
            regNo: score.student.studentRegNo,
            fullName: `${score.student.user.lastname || ''} ${
              score.student.user.firstname || ''
            } ${score.student.user.othername || ''}`.trim(),
            username: score.student.user.username,
          },
          subject: score.subject,
          class: score.class,
          classArm: score.classArm,
          session: score.session,
          term: score.termDefinition,
          assessmentComponent: score.markingSchemeComponent
            ? {
                id: score.markingSchemeComponent.id,
                name: score.markingSchemeComponent.name,
                type: score.markingSchemeComponent.type,
                maxScore: score.markingSchemeComponent.score,
              }
            : null,
          continuousAssessmentComponent: score.continuousAssessmentComponent
            ? {
                id: score.continuousAssessmentComponent.id,
                name: score.continuousAssessmentComponent.name,
                maxScore: score.continuousAssessmentComponent.score,
              }
            : null,
        })),
      };

      // Fetch additional data from StudentTermRecord if filters allow it
      if (
        filters.classId &&
        filters.classArmId &&
        filters.sessionId &&
        filters.termId
      ) {
        const studentIds = [...new Set(scores.map((score) => score.studentId))];
        const termRecords = await this.prisma.studentTermRecord.findMany({
          where: {
            studentId: { in: studentIds },
            classId: filters.classId,
            classArmId: filters.classArmId,
            sessionId: filters.sessionId,
            termDefinitionId: filters.termId,
            schoolId: user.schoolId,
          },
        });

        // Add additional data if any records exist
        const additionalDataArray = termRecords
          .filter(
            (record) =>
              record.punctuality ||
              record.attentiveness ||
              record.leadershipSkills ||
              record.neatness ||
              record.attendanceTotal !== null ||
              record.attendancePresent !== null ||
              record.attendanceAbsent !== null ||
              record.classTeacherComment ||
              record.principalComment,
          )
          .map((record) => ({
            studentId: record.studentId,
            punctuality: record.punctuality,
            attentiveness: record.attentiveness,
            leadershipSkills: record.leadershipSkills,
            neatness: record.neatness,
            attendanceTotal: record.attendanceTotal,
            attendancePresent: record.attendancePresent,
            attendanceAbsent: record.attendanceAbsent,
            classTeacherComment: record.classTeacherComment,
            principalComment: record.principalComment,
          }));

        if (additionalDataArray.length > 0) {
          responseData.additionalData = additionalDataArray;
        }
      }

      // Log the action
      await this.loggingService.logAction(
        'FETCH_SCORES',
        'StudentScoreAssignment',
        null,
        user.id,
        user.schoolId,
        {
          filters,
          totalRecords: scores.length,
        },
        req,
      );

      return {
        statusCode: 200,
        message: 'Scores retrieved successfully',
        data: responseData,
      };
    } catch (error) {
      console.error('Error fetching scores:', error);
      throw new Error(`Failed to fetch scores: ${error.message}`);
    }
  }
}
