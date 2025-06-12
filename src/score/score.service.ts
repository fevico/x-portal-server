import { Injectable, BadRequestException, NotFoundException } from '@nestjs/common';
import { FetchClassArmResultsDto, FetchStudentResultDto, FetchStudentScoresDto, SaveStudentScoresDto } from './dto/score.dto';
import { PrismaService } from '@/prisma/prisma.service';
import { LoggingService } from '@/log/logging.service';


@Injectable()
export class ScoreService {
  constructor(
    private prisma: PrismaService,
    private loggingService: LoggingService, // Adjust type based on your LoggingService
  ) {}

  // Save Student Scores
  async saveStudentScores(data: SaveStudentScoresDto, req: any) {
    const requester = req.user;

    try {
      // Validate inputs
      const studentClass = await this.prisma.studentClassAssignment.findFirst({
        where: {
          studentId: data.studentId,
          classId: data.classId,
          classArmId: data.classArmId,
          sessionId: data.sessionId,
          schoolId: data.schoolId,
          isActive: true,
        },
      });
      if (!studentClass) {
        throw new BadRequestException('Invalid student class assignment');
      }

      const subject = await this.prisma.subject.findUnique({
        where: { id: data.subjectId, schoolId: data.schoolId },
      });
      if (!subject) {
        throw new BadRequestException('Invalid subject');
      }

      const sessionTerm = await this.prisma.sessionTerm.findUnique({
        where: { id: data.sessionTermId, schoolId: data.schoolId },
      });
      if (!sessionTerm) {
        throw new BadRequestException('Invalid session term');
      }

      // Resolve marking scheme for the class and term
      const markingSchemeAssignment = await this.prisma.classTermMarkingSchemeAssignment.findFirst({
        where: {
          classId: data.classId,
          termDefinitionId: sessionTerm.termDefinitionId,
          schoolId: data.schoolId,
          isDeleted: false,
        },
        include: { markingScheme: { include: { components: true } } },
      });
      if (!markingSchemeAssignment) {
        throw new BadRequestException('No marking scheme assigned to this class and term');
      }

      // Save scores
      const scoreRecords = await this.prisma.$transaction(async (prisma) => Promise.all(data.scores.map(async (score) => {
          let markingSchemeComponentId = score.markingSchemeComponentId; 

          // If continuousAssessmentComponentId is provided, find the parent MarkingSchemeComponent
          if (score.continuousAssessmentComponentId) {
            const caComponent = await this.prisma.continuousAssessmentComponent.findUnique({
              where: { id: score.continuousAssessmentComponentId },
              include: { continuousAssessment: { include: { markingSchemeComponent: true } } },
            });
            if (!caComponent) {
              throw new BadRequestException('Invalid continuous assessment component');
            }
            markingSchemeComponentId = caComponent.continuousAssessment.markingSchemeComponentId;
          }

          // Validate component exists in the marking scheme
          if (markingSchemeComponentId) {
            const componentExists = markingSchemeAssignment.markingScheme.components.some(
              (c) => c.id === markingSchemeComponentId,
            );
            if (!componentExists) {
              throw new BadRequestException('Invalid marking scheme component');
            }
          }

          return this.prisma.studentScoreAssignment.upsert({
            where: {
              studentId_subjectId_sessionId_sessionTermId: {
                studentId: data.studentId,
                subjectId: data.subjectId,
                sessionId: data.sessionId,
                sessionTermId: data.sessionTermId,
              },
            },
            update: { score: score.score, updatedBy: data.recordedBy },
            create: {
              studentId: data.studentId,
              subjectId: data.subjectId,
              classId: data.classId,
              classArmId: data.classArmId,
              sessionId: data.sessionId,
              sessionTermId: data.sessionTermId,
              schoolId: data.schoolId,
              markingSchemeComponentId: markingSchemeComponentId,
              continuousAssessmentComponentId: score.continuousAssessmentComponentId,
              score: score.score,
              recordedBy: data.recordedBy,
              createdBy: data.recordedBy,
            },
          });
        }))
      );

      // Calculate component-level scores
      const allScores = await this.prisma.studentScoreAssignment.findMany({
        where: {
          studentId: data.studentId,
          subjectId: data.subjectId,
          sessionId: data.sessionId,
          sessionTermId: data.sessionTermId,
          schoolId: data.schoolId,
          isDeleted: false,
        },
        include: {
          markingSchemeComponent: { select: { id: true, name: true } },
          continuousAssessmentComponent: { select: { id: true, name: true } },
        },
      });

      const componentScores = allScores.reduce((acc, s) => {
        const componentId = s.markingSchemeComponentId;
        if (componentId) {
          acc[componentId] = {
            id: componentId,
            name: s.markingSchemeComponent?.name || '',
            score: (acc[componentId]?.score || 0) + s.score,
          };
        }
        return acc;
      }, {});

      // Total score
      const totalScore: number = Object.values(componentScores as { [key: string]: { score: number } }).reduce((sum: number, comp) => sum + comp.score, 0);

      // Get grading system
      const gradingSystem = await this.prisma.classGradingSystem.findFirst({
        where: { classId: data.classId, schoolId: data.schoolId, isDeleted: false },
        include: { gradingSystem: { include: { grades: { where: { isDeleted: false } } } } },
      });

      const grade = gradingSystem?.gradingSystem.grades.find(
        (g) => totalScore >= g.scoreStartPoint && totalScore <= g.scoreEndPoint,
      );

      // Update or create Result
      const result = await this.prisma.result.upsert({
        where: {
          studentId_subjectId_sessionId_sessionTermId: {
            studentId: data.studentId,
            subjectId: data.subjectId,
            sessionId: data.sessionId,
            sessionTermId: data.sessionTermId,
          },
        },
        update: {
          totalScore,
          componentScores,
          gradeId: grade?.id,
          remark: grade?.remark,
          updatedBy: data.recordedBy,
        },
        create: {
          studentId: data.studentId,
          subjectId: data.subjectId,
          classId: data.classId,
          classArmId: data.classArmId,
          sessionId: data.sessionId,
          sessionTermId: data.sessionTermId,
          schoolId: data.schoolId,
          gradingSystemId: gradingSystem?.gradingSystemId,
          totalScore,
          componentScores,
          gradeId: grade?.id,
          remark: grade?.remark,
          createdBy: data.recordedBy,
        },
      });

      // Log action
      await this.loggingService.logAction(
        'save_student_scores',
        'StudentScoreAssignment',
        data.studentId,
        requester.id,
        data.schoolId,
        {
          subjectId: data.subjectId,
          sessionTermId: data.sessionTermId,
          scores: data.scores,
        },
        req,
      );

      return {
        statusCode: 200,
        message: 'Scores saved successfully',
        data: { scores: scoreRecords, result },
      };
    } catch (error) {
      console.error('Error saving student scores:', error);
      throw new Error('Failed to save student scores: ' + (error.message || 'Unknown error'));
    }
  }

  // Fetch Student Scores
  async fetchStudentScores(dto: FetchStudentScoresDto) {
    try {
      const scores = await this.prisma.studentScoreAssignment.findMany({
        where: {
          studentId: dto.studentId,
          subjectId: dto.subjectId,
          sessionId: dto.sessionId,
          sessionTermId: dto.sessionTermId,
          schoolId: dto.schoolId,
          isDeleted: false,
        },
        include: {
          markingSchemeComponent: { select: { id: true, name: true, score: true, type: true } },
          continuousAssessmentComponent: { select: { id: true, name: true, score: true } },
        },
      });

      const result = scores.reduce((acc, score) => {
        const id = score.continuousAssessmentComponentId || score.markingSchemeComponentId;
        acc[id] = {
          id,
          name: score.continuousAssessmentComponent?.name || score.markingSchemeComponent?.name,
          score: score.score,
          markingSchemeComponentId: score.markingSchemeComponentId,
          continuousAssessmentComponentId: score.continuousAssessmentComponentId,
          type: score.markingSchemeComponent?.type,
        };
        return acc;
      }, {});

      return {
        statusCode: 200,
        message: 'Scores fetched successfully',
        data: result,
      };
    } catch (error) {
      console.error('Error fetching student scores:', error);
      throw new Error('Failed to fetch student scores: ' + (error.message || 'Unknown error'));
    }
  }

  // Fetch Student Result
  async fetchStudentResult(dto: FetchStudentResultDto) {
    try {
      // Fetch student class assignment to get classId and classArmId
      const studentClass = await this.prisma.studentClassAssignment.findFirst({
        where: {
          studentId: dto.studentId,
          sessionId: dto.sessionId,
          schoolId: dto.schoolId,
          isActive: true,
        },
      });
      if (!studentClass) {
        throw new BadRequestException('Student not assigned to a class');
      }

      // Fetch the Result
      const result = await this.prisma.result.findUnique({
        where: {
          studentId_subjectId_sessionId_sessionTermId: {
            studentId: dto.studentId,
            subjectId: dto.subjectId,
            sessionId: dto.sessionId,
            sessionTermId: dto.sessionTermId,
          },
        },
        include: {
          student: {
            include: {
              user: { select: { id: true, firstname: true, lastname: true, email: true } },
            },
          },
        },
      });

      if (!result) {
        throw new NotFoundException('Result not found');
      }

      // Fetch MarkingSchemeComponents
      const markingSchemeAssignment = await this.prisma.classTermMarkingSchemeAssignment.findFirst({
        where: {
          classId: result.classId,
          termDefinitionId: {
            in: [await this.prisma.sessionTerm.findUnique({
              where: { id: dto.sessionTermId },
              select: { termDefinitionId: true },
            }).then(t => t.termDefinitionId)].flat(),
          },
          schoolId: dto.schoolId,
          isDeleted: false,
        },
        include: {
          markingScheme: {
            include: {
              components: {
                select: { id: true, name: true },
                where: { isDeleted: false },
              },
            },
          },
        },
      });

      if (!markingSchemeAssignment) {
        throw new BadRequestException('No matching marking scheme found for the term');
      }

      // Map componentScores to include names
      const componentScoresWithNames = Object.entries(result.componentScores || []).reduce(
        (acc: any, [componentId, comp]: [string, any]) => {
          const component = markingSchemeAssignment.markingScheme.components.find(
            (c) => c.id === componentId,
          );
          if (component) {
            acc[componentId] = {
              id: comp.id,
              name: comp.name,
              score: comp.score,
            };
          }
          return acc;
        },
        {},
      );

      return {
        statusCode: 200,
        message: 'Result fetched successfully',
        data: {
          id: result.id,
          student: {
            id: result.student.id,
            user: result.student.user,
          },
          subjectId: result.subjectId,
          classId: result.classId,
          classArmId: result.classArmId,
          sessionId: result.sessionId,
          sessionTermId: result.sessionTermId,
          schoolId: result.schoolId,
          gradingSystemId: result.gradingSystemId,
          totalScore: result.totalScore,
          componentScores: componentScoresWithNames,
          gradeId: result.gradeId,
          remark: result.remark,
          createdBy: result.createdBy,
          updatedBy: result.updatedBy,
        },
      };
    } catch (error) {
      console.error('Error fetching student result:', error);
      throw new Error('Failed to fetch student result: ' + (error.message || 'Unknown error'));
    }
  }

  // Fetch All Student Results in a Class Arm
  async fetchClassArmResults(dto: FetchClassArmResultsDto) {
    try {
      // Validate inputs
      const classArm = await this.prisma.classArm.findUnique({
        where: { id: dto.classArmId, schoolId: dto.schoolId },
      });
      if (!classArm) {
        throw new BadRequestException('Invalid class arm');
      }

      const sessionTerm = await this.prisma.sessionTerm.findUnique({
        where: { id: dto.sessionTermId, schoolId: dto.schoolId },
      });
      if (!sessionTerm) {
        throw new BadRequestException('Invalid session term');
      }

      // Fetch results
      const results = await this.prisma.result.findMany({
        where: {
          classArmId: dto.classArmId,
          sessionId: dto.sessionId,
          sessionTermId: dto.sessionTermId,
          schoolId: dto.schoolId,
        },
        include: {
          student: {
            include: {
              user: { select: { id: true, firstname: true, lastname: true, email: true } },
            },
          },
          subject: { select: { id: true, name: true } },
        },
      });

      // Fetch marking scheme for the class and term
      const markingSchemeAssignment = await this.prisma.classTermMarkingSchemeAssignment.findFirst({
        where: {
          classId: {
            in: [await this.prisma.classArm.findUnique({
              where: { id: dto.classArmId },
              select: { id: true },
            }).then(() => this.prisma.sessionClassAssignment.findFirst({
              where: { classArmId: dto.classArmId, sessionId: dto.sessionId },
              select: { classId: true },
            }).then(a => a.classId))],
          },
          termDefinitionId: sessionTerm.termDefinitionId,
          schoolId: dto.schoolId,
          isDeleted: false,
        },
        include: {
          markingScheme: {
            include: {
              components: {
                select: { id: true, name: true },
                where: { isDeleted: false },
              },
            },
          },
        },
      });

      if (!markingSchemeAssignment) {
        throw new BadRequestException('No marking scheme assigned to this class and term');
      }

      // Map results with component scores
      const formattedResults = results.map((result) => {
        const componentScoresWithNames = Object.entries(result.componentScores || []).reduce(
          (acc: any, [componentId, comp]: [string, any]) => {
            const component = markingSchemeAssignment.markingScheme.components.find(
              (c) => c.id === componentId,
            );
            if (component) {
              acc[componentId] = {
                id: comp.id,
                name: comp.name,
                score: comp.score,
              };
            }
            return acc;
          },
          {},
        );

        return {
          id: result.id,
          student: {
            id: result.student.id,
            user: result.student.user,
          },
          subject: {
            id: result.subject.id,
            name: result.subject.name,
          },
          classId: result.classId,
          classArmId: result.classArmId,
          sessionId: result.sessionId,
          sessionTermId: result.sessionTermId,
          schoolId: result.schoolId,
          gradingSystemId: result.gradingSystemId,
          totalScore: result.totalScore,
          componentScores: componentScoresWithNames,
          gradeId: result.gradeId,
          remark: result.remark,
          createdBy: result.createdBy,
          updatedBy: result.updatedBy,
        };
      });

      return {
        statusCode: 200,
        message: 'Class arm results fetched successfully',
        data: formattedResults,
      };
    } catch (error) {
      console.error('Error fetching class arm results:', error);
      throw new Error('Failed to fetch class arm results: ' + (error.message || 'Unknown error'));
    }
  }
}
