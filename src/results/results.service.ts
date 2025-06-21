import { LoggingService } from '@/log/logging.service';
import { PrismaService } from '@/prisma/prisma.service';
import { Injectable } from '@nestjs/common';
import { GetResultsQueryDto } from './dto/results.dto';
import { AssessmentType } from '@prisma/client';
import { generateResultBatchUniqueHash } from '@/utils/hash.util';

@Injectable()
export class ResultsService {
  constructor(
    private prisma: PrismaService,
    private loggingService: LoggingService,
  ) {}
  async getAllResults(
    query: GetResultsQueryDto,
    req: any,
  ): Promise<{
    results: any[];
    total: number;
    page: number;
    limit: number;
  }> {
    try {
      // Convert page and limit to numbers
      const page = Number(query.page) || 1;
      const limit = Number(query.limit) || 10;
      const { q, all, type } = query;
      const skip = (page - 1) * limit;

      const whereClause: any = {
        schoolId: req.user.schoolId,
      };

      // If 'all' is not provided or false, only return approved results
      if (!all) {
        whereClause.isApproved = true;
      }

      if (type === AssessmentType.EXAM) {
        whereClause.resultScope = AssessmentType.EXAM;
      } else if (type === AssessmentType.CA) {
        whereClause.resultScope = AssessmentType.CA;
      }

      // Add search filter if query provided
      if (q) {
        whereClause.OR = [
          {
            studentResults: {
              some: {
                student: {
                  user: {
                    firstname: {
                      contains: q,
                    },
                  },
                },
              },
            },
          },
          {
            studentResults: {
              some: {
                student: {
                  user: {
                    lastname: {
                      contains: q,
                    },
                  },
                },
              },
            },
          },
        ];
      }

      const [results, total] = await Promise.all([
        this.prisma.resultBatch.findMany({
          where: whereClause,
          include: {
            session: true,
            termDefinition: true,
            class: true,
            classArm: true,
            resultType: true,
            // createdBy: {
            //   select: { name: true, id: true },
            // },
            _count: {
              select: { studentResults: true },
            },
          },
          orderBy: { createdAt: 'desc' },
          skip,
          take: limit,
        }),
        this.prisma.resultBatch.count({
          where: whereClause,
        }),
      ]);

      return {
        results,
        total,
        page,
        limit,
      };
    } catch (error) {
      console.error('Error fetching results', error);
      throw error;
    }
  }

  async computeResults(
    sessionId: string,
    termId: string,
    classId: string,
    classArmId: string,
    resultScope: AssessmentType,
    resultTypeId: string,
    req,
  ) {
    const userId = req.user.id;
    const schoolId = req.user.schoolId;
    // 1. Get the marking scheme structure for this class and term
    const markingSchemeStructure = await this.getMarkingSchemeStructure(
      classId,
      termId,
      resultScope,
      resultTypeId,
      schoolId,
    );

    // 2. Create the result batch with the marking scheme structure
    const batchTitle = await this.generateBatchTitle(
      sessionId,
      termId,
      classId,
      classArmId,
      resultScope,
      schoolId,
    );

    // const resultBatch = await this.prisma.resultBatch.create({
    //   data: {
    //     sessionId,
    //     termId,
    //     classId,
    //     classArmId,
    //     resultTypeId,
    //     resultScope,
    //     schoolId,
    //     title: batchTitle,
    //     markingSchemeStructure, // Store the structure used
    //     createdBy: userId,
    //     totalStudents: 0,
    //     totalSubjects: 0,
    //   },
    // });

    const uniqueHash = generateResultBatchUniqueHash({
      sessionId,
      termId,
      classId,
      classArmId,
      resultTypeId,
      resultScope,
      schoolId,
    });

    // Check if a result batch with this unique hash already exists
    const existingBatch = await this.prisma.resultBatch.findUnique({
      where: { uniqueHash },
    });

    let resultBatch;
    if (existingBatch) {
      // Update existing batch
      resultBatch = await this.prisma.resultBatch.update({
        where: { uniqueHash },
        data: {
          title: batchTitle,
          markingSchemeStructure,
          updatedAt: new Date(),
        },
      });
    } else {
      // Create new batch
      resultBatch = await this.prisma.resultBatch.create({
        data: {
          // Use connect for relations instead of direct IDs
          session: { connect: { id: sessionId } },
          termDefinition: { connect: { id: termId } },
          class: { connect: { id: classId } },
          classArm: { connect: { id: classArmId } },
          resultType: { connect: { id: resultTypeId } },
          school: { connect: { id: schoolId } },
          createdBy: userId,
          uniqueHash,

          // Direct fields
          resultScope,
          title: batchTitle,
          markingSchemeStructure,
          totalStudents: 0,
          totalSubjects: 0,
        },
      });
    }

    // 3. Get all students and subjects
    const students = await this.getStudentsInClassArm(
      sessionId,
      classId,
      classArmId,
      schoolId,
    );
    const subjects = await this.getSubjectsForClassArm(
      classId,
      classArmId,
      schoolId,
    );
    const gradingSystem = await this.getGradingSystemForClass(
      classId,
      schoolId,
    );

    const studentResults = [];
    let totalClassScore = 0;
    let totalResults = 0;

    // 4. Compute results for each student-subject combination
    for (const student of students) {
      for (const subject of subjects) {
        const result = await this.computeStudentSubjectResult(
          resultBatch.id,
          student.id,
          subject.id,
          sessionId,
          termId,
          markingSchemeStructure,
          resultScope,
          resultTypeId,
          gradingSystem,
          schoolId,
        );

        if (result) {
          studentResults.push(result);
          totalClassScore += result.totalScore;
          totalResults++;
        }
      }
    }

    // 5. Calculate positions for each subject
    await this.calculatePositions(resultBatch.id, subjects, schoolId);

    // 6. Update batch statistics
    const classAverage = totalResults > 0 ? totalClassScore / totalResults : 0;
    await this.prisma.resultBatch.update({
      where: { id: resultBatch.id },
      data: {
        totalStudents: students.length,
        totalSubjects: subjects.length,
        classAverage,
      },
    });

    return {
      batchId: resultBatch.id,
      title: batchTitle,
      totalStudents: students.length,
      totalSubjects: subjects.length,
      classAverage,
      studentsProcessed: studentResults.length,
      markingSchemeStructure,
    };
  }

  private async getMarkingSchemeStructure(
    classId: string,
    termId: string,
    resultScope: AssessmentType,
    resultTypeId: string,
    schoolId: string,
  ) {
    // Get the marking scheme assignment for this class and term
    const markingSchemeAssignment =
      await this.prisma.classTermMarkingSchemeAssignment.findFirst({
        where: {
          classId,
          termDefinitionId: termId,
          schoolId,
        },
        include: {
          markingScheme: {
            include: {
              components: {
                include: {
                  continuousAssessments: {
                    include: {
                      components: true,
                    },
                  },
                },
              },
            },
          },
        },
      });

    if (!markingSchemeAssignment) {
      throw new Error('No marking scheme found for this class and term');
    }

    const components = markingSchemeAssignment.markingScheme.components;

    if (resultScope === AssessmentType.CA) {
      // For mid-term, only include the specific component
      const targetComponent = components.find((c) => c.id === resultTypeId);
      if (!targetComponent) {
        throw new Error('Component not found in marking scheme');
      }

      return this.buildComponentStructure([targetComponent]);
    } else {
      // For terminal, include all components
      return this.buildComponentStructure(components);
    }
  }

  private buildComponentStructure(components: any[]) {
    const structure = {
      components: [],
      totalMarks: 0,
      layout: {}, // For frontend rendering
    };

    for (const component of components) {
      const componentData = {
        id: component.id,
        name: component.name,
        score: component.score,
        type: component.type,
        subComponents: [],
      };

      if (
        component.type === 'CA' &&
        component.continuousAssessments.length > 0
      ) {
        // Handle CA with sub-components
        const caAssessment = component.continuousAssessments[0];
        for (const subComponent of caAssessment.components) {
          componentData.subComponents.push({
            id: subComponent.id,
            name: subComponent.name,
            score: subComponent.score,
          });
        }
      }

      structure.components.push(componentData);
      structure.totalMarks += component.score;
    }

    // Build layout for frontend table headers
    structure.layout = this.buildTableLayout(structure.components);

    return structure;
  }

  private buildTableLayout(components: any[]) {
    const headers = [];

    for (const component of components) {
      if (component.subComponents.length > 0) {
        // CA with sub-components
        for (const subComp of component.subComponents) {
          headers.push({
            key: `${component.id}_${subComp.id}`,
            label: subComp.name,
            maxScore: subComp.score,
            parentComponent: component.name,
          });
        }
      } else {
        // Direct component (usually EXAM)
        headers.push({
          key: component.id,
          label: component.name,
          maxScore: component.score,
          parentComponent: null,
        });
      }
    }

    headers.push({
      key: 'total',
      label: 'TOTAL',
      maxScore: components.reduce((sum, c) => sum + c.score, 0),
      parentComponent: null,
    });

    headers.push({
      key: 'grade',
      label: 'GRADE',
      maxScore: null,
      parentComponent: null,
    });

    return { headers };
  }

  private async computeStudentSubjectResult(
    resultBatchId: string,
    studentId: string,
    subjectId: string,
    sessionId: string,
    termId: string,
    markingSchemeStructure: any,
    resultScope: AssessmentType,
    resultTypeId: string,
    gradingSystem: any,
    schoolId: string,
  ) {
    const componentScores = {};
    let totalScore = 0;

    // Get scores for each component in the marking scheme
    for (const component of markingSchemeStructure.components) {
      if (component.subComponents.length > 0) {
        // Handle CA with sub-components
        let componentTotal = 0;
        const subScores = {};

        for (const subComponent of component.subComponents) {
          const score = await this.getStudentScore(
            studentId,
            subjectId,
            sessionId,
            termId,
            component.id,
            subComponent.id,
            schoolId,
          );
          subScores[subComponent.id] = score;
          componentTotal += score;
        }

        componentScores[component.id] = {
          total: componentTotal,
          subComponents: subScores,
          maxScore: component.score,
        };
        totalScore += componentTotal;
      } else {
        // Handle direct component (EXAM)
        const score = await this.getStudentScore(
          studentId,
          subjectId,
          sessionId,
          termId,
          component.id,
          null,
          schoolId,
        );
        componentScores[component.id] = {
          total: score,
          maxScore: component.score,
        };
        totalScore += score;
      }
    }

    // Determine grade
    const grade = this.determineGrade(totalScore, gradingSystem?.grades || []);

    // Create student result record
    return await this.prisma.studentResult.create({
      data: {
        resultBatchId,
        studentId,
        subjectId,
        totalScore,
        gradeId: grade?.id,
        componentScores,
        schoolId,
      },
    });
  }

  private async getStudentScore(
    studentId: string,
    subjectId: string,
    sessionId: string,
    termId: string,
    componentId: string,
    subComponentId: string | null,
    schoolId: string,
  ): Promise<number> {
    const scoreRecord = await this.prisma.studentScoreAssignment.findFirst({
      where: {
        studentId,
        subjectId,
        sessionId,
        termDefinitionId: termId,
        markingSchemeComponentId: componentId,
        continuousAssessmentComponentId: subComponentId,
        schoolId,
      },
    });

    return scoreRecord?.score || 0;
  }

  private async generateBatchTitle(
    sessionId: string,
    termId: string,
    classId: string,
    classArmId: string,
    resultScope: AssessmentType,
    schoolId: string,
  ): Promise<string> {
    const [session, termDefinition, classInfo, classArm] = await Promise.all([
      this.prisma.session.findUnique({
        where: { id: sessionId, schoolId },
        select: { name: true },
      }),
      this.prisma.termDefinition.findUnique({
        where: { id: termId, schoolId },
        select: { name: true },
      }),
      this.prisma.class.findUnique({
        where: { id: classId, schoolId },
        select: { name: true },
      }),
      this.prisma.classArm.findUnique({
        where: { id: classArmId, schoolId },
        select: { name: true },
      }),
    ]);

    if (!session || !termDefinition || !classInfo || !classArm) {
      throw new Error('Required entities not found for batch title generation');
    }

    const scopeText = resultScope === AssessmentType.EXAM ? 'Terminal' : 'CA';
    const termText = termDefinition?.name?.replace('_', ' ') || 'Unknown Term';

    return `${session.name} ${termText} ${scopeText} Results - ${classInfo?.name} ${classArm?.name}`;
  }

  private determineGrade(totalScore: number, grades: any[]): any | null {
    if (!grades || grades.length === 0) return null;

    // Sort grades by score range to ensure proper matching
    const sortedGrades = grades.sort(
      (a, b) => b.scoreStartPoint - a.scoreStartPoint,
    );

    return (
      sortedGrades.find(
        (grade) =>
          totalScore >= grade.scoreStartPoint &&
          totalScore <= grade.scoreEndPoint,
      ) || null
    );
  }

  private async calculatePositions(
    resultBatchId: string,
    subjects: any[],
    schoolId: string,
  ): Promise<void> {
    // Calculate positions for each subject separately
    for (const subject of subjects) {
      // Get all student results for this subject in the batch, ordered by total score (highest first)
      const subjectResults = await this.prisma.studentResult.findMany({
        where: {
          resultBatchId,
          subjectId: subject.id,
          schoolId,
        },
        orderBy: {
          totalScore: 'desc',
        },
      });

      // Update positions
      for (let i = 0; i < subjectResults.length; i++) {
        const position = i + 1;
        await this.prisma.studentResult.update({
          where: { id: subjectResults[i].id },
          data: { position },
        });
      }
    }
  }

  private async getGradingSystemForClass(
    classId: string,
    schoolId: string,
  ): Promise<any | null> {
    const classGradingAssignment =
      await this.prisma.classGradingSystem.findFirst({
        where: {
          classId,
          schoolId,
          isDeleted: false,
        },
        include: {
          gradingSystem: {
            include: {
              grades: {
                orderBy: {
                  scoreStartPoint: 'asc',
                },
              },
            },
          },
        },
      });

    return classGradingAssignment?.gradingSystem || null;
  }

  private async getSubjectsForClassArm(
    classId: string,
    classArmId: string,
    schoolId: string,
  ): Promise<any[]> {
    const classArmSubjectAssignments =
      await this.prisma.classArmSubjectAssignment.findMany({
        where: {
          classId,
          classArmId,
          schoolId,
          isActive: true,
        },
        include: {
          subject: {
            select: {
              id: true,
              name: true,
              code: true,
            },
          },
        },
      });

    return classArmSubjectAssignments.map((assignment) => assignment.subject);
  }

  private async getStudentsInClassArm(
    sessionId: string,
    classId: string,
    classArmId: string,
    schoolId: string,
  ): Promise<any[]> {
    // Get students who are assigned to this class arm for the specific session
    const studentClassAssignments =
      await this.prisma.studentClassAssignment.findMany({
        where: {
          sessionId,
          classId,
          classArmId,
          schoolId,
          isActive: true,
        },
        include: {
          student: {
            select: {
              id: true,
              studentRegNo: true,
              user: {
                select: {
                  id: true,
                  firstname: true,
                  lastname: true,
                  username: true,
                },
              },
            },
          },
        },
      });

    return studentClassAssignments.map((assignment) => assignment.student);
  }

  /**
   * Approve a result batch
   * @param resultBatchId - The ID of the result batch to approve
   * @param req - Request object containing user information
   * @returns Updated result batch with approval status
   */
  async approveResult(resultBatchId: string, req: any) {
    try {
      const schoolId = req.user.schoolId;
      const approvedBy = req.user.id;

      // Check if result batch exists and belongs to the school
      const existingBatch = await this.prisma.resultBatch.findFirst({
        where: {
          id: resultBatchId,
          schoolId,
        },
      });

      if (!existingBatch) {
        throw new Error('Result batch not found or access denied');
      }

      if (existingBatch.isApproved) {
        throw new Error('Result batch is already approved');
      }

      // Update the result batch to approved
      const approvedBatch = await this.prisma.resultBatch.update({
        where: { id: resultBatchId },
        data: {
          isApproved: true,
          approvedBy,
          approvedAt: new Date(),
        },
        include: {
          session: true,
          termDefinition: true,
          class: true,
          classArm: true,
          resultType: true,
          _count: {
            select: { studentResults: true },
          },
        },
      });

      console.log(
        `Result batch ${resultBatchId} approved by user ${approvedBy}`,
      );

      return {
        success: true,
        message: 'Result batch approved successfully',
        result: approvedBatch,
      };
    } catch (error) {
      console.error('Error approving result batch', error);
      throw error;
    }
  }

  /**
   * Get detailed result batch by ID with all student results and layout structure
   * @param resultBatchId - The ID of the result batch
   * @param req - Request object containing user information
   * @returns Comprehensive result data including layout, students, and scores
   */
  async getResultBatchById(resultBatchId: string, req: any) {
    try {
      const schoolId = req.user.schoolId;

      // Get the result batch with basic information
      const resultBatch = await this.prisma.resultBatch.findFirst({
        where: {
          id: resultBatchId,
          schoolId,
        },
        include: {
          session: {
            select: { id: true, name: true },
          },
          termDefinition: {
            select: { id: true, name: true },
          },
          class: {
            select: { id: true, name: true },
          },
          classArm: {
            select: { id: true, name: true },
          },
          resultType: {
            select: { id: true, name: true },
          },
          _count: {
            select: { studentResults: true },
          },
        },
      });

      if (!resultBatch) {
        throw new Error('Result batch not found or access denied');
      }

      // Get all student results for this batch with detailed information
      const studentResults = await this.prisma.studentResult.findMany({
        where: {
          resultBatchId,
          schoolId,
        },
        include: {
          student: {
            include: {
              user: {
                select: {
                  id: true,
                  firstname: true,
                  lastname: true,
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
          grade: {
            select: {
              id: true,
              name: true,
              scoreStartPoint: true,
              scoreEndPoint: true,
            },
          },
        },
        orderBy: [
          { student: { user: { lastname: 'asc' } } },
          { student: { user: { firstname: 'asc' } } },
          { subject: { name: 'asc' } },
        ],
      });

      // Get all unique students
      const studentsMap = new Map();
      studentResults.forEach((result) => {
        const studentId = result.student.id;
        if (!studentsMap.has(studentId)) {
          studentsMap.set(studentId, {
            id: result.student.id,
            studentRegNo: result.student.studentRegNo,
            user: result.student.user,
            subjects: [],
            totalScore: 0,
            averageScore: 0,
            overallPosition: 0,
          });
        }
      });

      // Get all unique subjects
      const subjectsMap = new Map();
      studentResults.forEach((result) => {
        const subjectId = result.subject.id;
        if (!subjectsMap.has(subjectId)) {
          subjectsMap.set(subjectId, result.subject);
        }
      });

      // Organize results by student and subject
      const studentsWithResults = Array.from(studentsMap.values()).map(
        (student) => {
          const studentSubjectResults = studentResults.filter(
            (result) => result.student.id === student.id,
          );

          // Calculate student totals
          let totalScore = 0;
          let subjectCount = 0;

          const subjects = Array.from(subjectsMap.values()).map((subject) => {
            const subjectResult = studentSubjectResults.find(
              (result) => result.subject.id === subject.id,
            );

            if (subjectResult) {
              totalScore += subjectResult.totalScore;
              subjectCount++;

              return {
                subject,
                totalScore: subjectResult.totalScore,
                position: subjectResult.position,
                grade: subjectResult.grade,
                componentScores: subjectResult.componentScores,
              };
            }

            return {
              subject,
              totalScore: 0,
              position: null,
              grade: null,
              componentScores: {},
            };
          });

          return {
            ...student,
            subjects,
            totalScore,
            averageScore: subjectCount > 0 ? totalScore / subjectCount : 0,
          };
        },
      );

      // Calculate overall positions
      studentsWithResults.sort((a, b) => b.totalScore - a.totalScore);
      studentsWithResults.forEach((student, index) => {
        student.overallPosition = index + 1;
      });

      // Get class statistics
      const classStats = {
        totalStudents: studentsWithResults.length,
        totalSubjects: Array.from(subjectsMap.values()).length,
        highestScore:
          studentsWithResults.length > 0
            ? studentsWithResults[0].totalScore
            : 0,
        lowestScore:
          studentsWithResults.length > 0
            ? studentsWithResults[studentsWithResults.length - 1].totalScore
            : 0,
        classAverage: resultBatch.classAverage || 0,
      };

      return {
        resultBatch: {
          id: resultBatch.id,
          title: resultBatch.title,
          resultScope: resultBatch.resultScope,
          isApproved: resultBatch.isApproved,
          approvedBy: resultBatch.approvedBy,
          approvedAt: resultBatch.approvedAt,
          createdAt: resultBatch.createdAt,
          updatedAt: resultBatch.updatedAt,
          session: resultBatch.session,
          termDefinition: resultBatch.termDefinition,
          class: resultBatch.class,
          classArm: resultBatch.classArm,
          resultType: resultBatch.resultType,
        },
        markingSchemeStructure: resultBatch.markingSchemeStructure,
        students: studentsWithResults,
        subjects: Array.from(subjectsMap.values()),
        classStats,
      };
    } catch (error) {
      console.error('Error fetching result batch details', error);
      throw error;
    }
  }
}
