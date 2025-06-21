import {
  Injectable,
  HttpException,
  HttpStatus,
  BadRequestException,
  NotFoundException,
} from '@nestjs/common';
import { SaveScoresDto, FetchScoresDto, StudentScore } from './dto/score.dto';
import { PrismaService } from '@/prisma/prisma.service';
import { LoggingService } from '@/log/logging.service';
import { AuthenticatedUser } from '@/types/express';
import { AssessmentType } from '@prisma/client';
import { generateScoreUniqueHash } from '@/utils/hash.util';

@Injectable()
export class ScoreService {
  constructor(
    private prisma: PrismaService,
    private loggingService: LoggingService,
  ) {}

  /**
   * Save or update scores for students
   * Handles both single student multiple subjects and multiple students single subject
   */
  // async saveScores(data: SaveScoresDto, req: any) {
  //   try {
  //     const user = req.user as AuthenticatedUser;
  //     const schoolId = user.schoolId;

  //     // Validate school association
  //     if (!schoolId) {
  //       throw new BadRequestException('User must be associated with a school');
  //     }

  //     // Validate session exists and belongs to the school
  //     const session = await this.prisma.session.findFirst({
  //       where: {
  //         id: data.sessionId,
  //         schoolId,
  //         isDeleted: false,
  //       },
  //     });

  //     if (!session) {
  //       throw new NotFoundException('Session not found for this school');
  //     }

  //     // Validate term exists and belongs to the school
  //     const termDefinition = await this.prisma.termDefinition.findFirst({
  //       where: {
  //         id: data.termId,
  //         schoolId,
  //       },
  //     });

  //     if (!termDefinition) {
  //       throw new NotFoundException('Term not found for this school');
  //     }

  //     // Validate class exists and belongs to the school
  //     const classExists = await this.prisma.class.findFirst({
  //       where: {
  //         id: data.classId,
  //         schoolId,
  //         isDeleted: false,
  //       },
  //     });

  //     if (!classExists) {
  //       throw new NotFoundException('Class not found for this school');
  //     }

  //     // Validate class arm exists and belongs to the school
  //     const classArmExists = await this.prisma.classArm.findFirst({
  //       where: {
  //         id: data.classArmId,
  //         schoolId,
  //         isDeleted: false,
  //       },
  //     });

  //     if (!classArmExists) {
  //       throw new NotFoundException('Class arm not found for this school');
  //     }

  //     // Validate subject exists and belongs to the school
  //     const subject = await this.prisma.subject.findFirst({
  //       where: {
  //         id: data.subjectId,
  //         schoolId,
  //         isDeleted: false,
  //       },
  //     });

  //     if (!subject) {
  //       throw new NotFoundException('Subject not found for this school');
  //     }

  //     // Process scores in transaction to ensure data consistency
  //     const result = await this.prisma.$transaction(async (tx) => {
  //       const processedScores = [];
  //       const errors = [];

  //       for (const scoreEntry of data.scores) {
  //         try {
  //           // Validate student exists and is assigned to the class
  //           const studentAssignment = await tx.studentClassAssignment.findFirst(
  //             {
  //               where: {
  //                 studentId: scoreEntry.studentId,
  //                 sessionId: data.sessionId,
  //                 classId: data.classId,
  //                 classArmId: data.classArmId,
  //                 schoolId,
  //                 isActive: true,
  //               },
  //             },
  //           );

  //           if (!studentAssignment) {
  //             errors.push(
  //               `Student ${scoreEntry.studentId} is not assigned to this class`,
  //             );
  //             continue;
  //           }

  //           // Determine component IDs based on score type and data structure
  //           let markingSchemeComponentId: string | null = null;
  //           let continuousAssessmentComponentId: string | null = null;

  //           if (scoreEntry.type === AssessmentType.EXAM) {
  //             // For EXAM, componentId is the markingSchemeComponentId
  //             markingSchemeComponentId = scoreEntry.componentId;
  //           } else if (scoreEntry.type === AssessmentType.CA) {
  //             if (scoreEntry.subComponentId) {
  //               // For CA with sub-component, subComponentId is the continuousAssessmentComponentId
  //               continuousAssessmentComponentId = scoreEntry.subComponentId;

  //               // Verify the sub-component exists and get parent component
  //               const caComponent =
  //                 await tx.continuousAssessmentComponent.findFirst({
  //                   where: {
  //                     id: scoreEntry.subComponentId,
  //                     schoolId,
  //                   },
  //                   include: {
  //                     continuousAssessment: {
  //                       include: {
  //                         markingSchemeComponent: true,
  //                       },
  //                     },
  //                   },
  //                 });

  //               if (!caComponent) {
  //                 errors.push(
  //                   `Continuous assessment component ${scoreEntry.subComponentId} not found`,
  //                 );
  //                 continue;
  //               }

  //               markingSchemeComponentId =
  //                 caComponent.continuousAssessment.markingSchemeComponentId;
  //             } else {
  //               // For CA without sub-component, componentId is the markingSchemeComponentId
  //               markingSchemeComponentId = scoreEntry.componentId;
  //             }
  //           }

  //           const uniqueHash = generateScoreUniqueHash({
  //             schoolId,
  //             studentId: scoreEntry.studentId,
  //             subjectId: data.subjectId,
  //             sessionId: data.sessionId,
  //             termDefinitionId: data.termId,
  //             markingSchemeComponentId: scoreEntry.componentId,
  //             continuousAssessmentComponentId: scoreEntry.subComponentId,
  //           });

  //           // Check if score record already exists
  //           const existingScore = await tx.studentScoreAssignment.findFirst({
  //             where: {
  //               // studentId: scoreEntry.studentId,
  //               // subjectId: data.subjectId,
  //               // sessionId: data.sessionId,
  //               // termDefinitionId: data.termId,
  //               // markingSchemeComponentId,
  //               // continuousAssessmentComponentId,
  //               // schoolId,
  //               uniqueHash,
  //             },
  //           });

  //           const scoreData = {
  //             studentId: scoreEntry.studentId,
  //             subjectId: data.subjectId,
  //             classId: data.classId,
  //             classArmId: data.classArmId,
  //             sessionId: data.sessionId,
  //             termDefinitionId: data.termId,
  //             markingSchemeComponentId,
  //             continuousAssessmentComponentId,
  //             score: scoreEntry.score,
  //             recordedBy: user.id,
  //             schoolId,
  //             uniqueHash,
  //             updatedBy: user.id,
  //           };

  //           let savedScore;

  //           if (existingScore) {
  //             // Update existing score
  //             savedScore = await tx.studentScoreAssignment.update({
  //               where: { id: existingScore.id },
  //               data: {
  //                 ...scoreData,
  //                 updatedAt: new Date(),
  //               },
  //             });
  //           } else {
  //             // Create new score
  //             savedScore = await tx.studentScoreAssignment.create({
  //               data: {
  //                 ...scoreData,
  //                 createdBy: user.id,
  //               },
  //             });
  //           }

  //           processedScores.push({
  //             id: savedScore.id,
  //             studentId: scoreEntry.studentId,
  //             componentId: scoreEntry.componentId,
  //             score: scoreEntry.score,
  //             action: existingScore ? 'updated' : 'created',
  //           });
  //         } catch (error) {
  //           errors.push(
  //             `Error processing score for student ${scoreEntry.studentId}: ${error.message}`,
  //           );
  //         }
  //       }

  //       return { processedScores, errors };
  //     });

  //     // Log the action
  //     await this.loggingService.logAction(
  //       'SAVE_SCORES',
  //       'StudentScoreAssignment',
  //       data.subjectId,
  //       user.id,
  //       schoolId,
  //       {
  //         sessionId: data.sessionId,
  //         classId: data.classId,
  //         subjectId: data.subjectId,
  //         totalScores: data.scores.length,
  //         processedScores: result.processedScores.length,
  //         errors: result.errors.length,
  //       },
  //       req,
  //     );

  //     return {
  //       statusCode: 200,
  //       message: 'Scores processed successfully',
  //       data: {
  //         session: { id: session.id, name: session.name },
  //         class: { id: classExists.id, name: classExists.name },
  //         classArm: { id: classArmExists.id, name: classArmExists.name },
  //         subject: { id: subject.id, name: subject.name, code: subject.code },
  //         summary: {
  //           totalSubmitted: data.scores.length,
  //           successful: result.processedScores.length,
  //           failed: result.errors.length,
  //         },
  //         processedScores: result.processedScores,
  //         errors: result.errors,
  //       },
  //     };
  //   } catch (error) {
  //     if (error instanceof HttpException) {
  //       throw error;
  //     }
  //     console.error('Error saving scores:', error);
  //     throw new HttpException(
  //       'Failed to save scores: ' + (error.message || 'Unknown error'),
  //       HttpStatus.INTERNAL_SERVER_ERROR,
  //     );
  //   }
  // }

  // In your score service, update the saveScores method:

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

      for (const scoreEntry of data.scores) {
        // Validate student assignment
        if (!validStudentIds.has(scoreEntry.studentId)) {
          errors.push(
            `Student ${scoreEntry.studentId} is not assigned to this class`,
          );
          continue;
        }

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

      // Transform scores to the required format
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

      return {
        statusCode: 200,
        message: 'Scores retrieved successfully',
        data: {
          filters,
          totalRecords: studentScores.length,
          scores: studentScores,
        },
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
        data: {
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
            continuousAssessment: score.continuousAssessment
              ? {
                  id: score.continuousAssessment.id,
                  parentComponent:
                    score.continuousAssessment.markingSchemeComponent,
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
        },
      };
    } catch (error) {
      console.error('Error fetching scores:', error);
      throw new Error(`Failed to fetch scores: ${error.message}`);
    }
  }
}
