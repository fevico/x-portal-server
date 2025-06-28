import { LoggingService } from '@/log/logging.service';
import { PrismaService } from '@/prisma/prisma.service';
import { Injectable } from '@nestjs/common';
import { GetResultsQueryDto } from './dto/results.dto';
import { AssessmentType } from '@prisma/client';
import {
  generateResultBatchUniqueHash,
  generateStudentTermRecordUniqueHash,
} from '@/utils/hash.util';

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

    headers.push({
      key: 'comment',
      label: 'COMMENT',
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
    const maxScore = markingSchemeStructure.totalMarks || 100;
    const grade = this.determineGrade(
      totalScore,
      maxScore,
      resultScope,
      gradingSystem?.grades || [],
    );

    // Upsert student result record (update if exists, create if not)
    const existingResult = await this.prisma.studentResult.findFirst({
      where: {
        resultBatchId,
        studentId,
        subjectId,
      },
    });

    if (existingResult) {
      // Update existing result
      return await this.prisma.studentResult.update({
        where: {
          id: existingResult.id,
        },
        data: {
          totalScore,
          gradeId: grade?.id,
          componentScores,
        },
      });
    } else {
      // Create new result
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

  private determineGrade(
    totalScore: number,
    maxScore: number,
    resultScope: AssessmentType,
    grades: any[],
  ): any | null {
    if (!grades || grades.length === 0) return null;

    // Calculate percentage for both CA and EXAM
    const percentage = maxScore > 0 ? (totalScore / maxScore) * 100 : 0;

    // Sort grades by score range to ensure proper matching (highest first)
    const sortedGrades = grades.sort(
      (a, b) => b.scoreStartPoint - a.scoreStartPoint,
    );

    return (
      sortedGrades.find(
        (grade) =>
          percentage >= grade.scoreStartPoint &&
          percentage <= grade.scoreEndPoint,
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

    // Return configured grading system if found
    if (classGradingAssignment?.gradingSystem) {
      return classGradingAssignment.gradingSystem;
    }

    // Return default grading system if none is configured
    return {
      id: 'default',
      name: 'Default Grading System',
      grades: [
        {
          id: 'grade-a',
          name: 'A',
          scoreStartPoint: 80,
          scoreEndPoint: 100,
          remark: 'Excellent',
        },
        {
          id: 'grade-b',
          name: 'B',
          scoreStartPoint: 70,
          scoreEndPoint: 79,
          remark: 'Very Good',
        },
        {
          id: 'grade-c',
          name: 'C',
          scoreStartPoint: 60,
          scoreEndPoint: 69,
          remark: 'Good',
        },
        {
          id: 'grade-d',
          name: 'D',
          scoreStartPoint: 45,
          scoreEndPoint: 59,
          remark: 'Fair',
        },
        {
          id: 'grade-f',
          name: 'F',
          scoreStartPoint: 0,
          scoreEndPoint: 44,
          remark: 'Fail',
        },
      ],
    };
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
   * Enhanced with behavioral data, attendance, demographics, and comprehensive stats
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

      // Get the grading system for determining grades and comments
      const gradingSystem = await this.getGradingSystemForClass(
        resultBatch.class.id,
        schoolId,
      );

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
                  othername: true,
                  username: true,
                  gender: true,
                  avatar: true,
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
              remark: true, // Include remark for comments
            },
          },
        },
        orderBy: [
          { student: { user: { lastname: 'asc' } } },
          { student: { user: { firstname: 'asc' } } },
          { subject: { name: 'asc' } },
        ],
      });

      // Get all unique students with enhanced data
      const studentsMap = new Map();
      const studentIds = new Set<string>();

      studentResults.forEach((result) => {
        const studentId = result.student.id;
        studentIds.add(studentId);

        if (!studentsMap.has(studentId)) {
          // Calculate age from date of birth
          const age = result.student.dateOfBirth
            ? this.calculateAge(result.student.dateOfBirth)
            : null;

          studentsMap.set(studentId, {
            id: result.student.id,
            studentRegNo: result.student.studentRegNo,
            user: result.student.user,
            dateOfBirth: result.student.dateOfBirth,
            age,
            subjects: [],
            totalScore: 0,
            averageScore: 0,
            overallPosition: 0,
            // These will be populated from StudentTermRecord
            behavioralData: {},
            attendanceData: {},
            comments: {},
          });
        }
      });

      // Fetch StudentTermRecord data for behavioral, attendance, and comments using unique hash
      const uniqueHashes = Array.from(studentIds).map((studentId) =>
        generateStudentTermRecordUniqueHash({
          studentId,
          classId: resultBatch.class.id,
          classArmId: resultBatch.classArm.id,
          sessionId: resultBatch.session.id,
          termDefinitionId: resultBatch.termDefinition.id,
          schoolId,
        }),
      );

      const termRecords = await this.prisma.studentTermRecord.findMany({
        where: {
          uniqueHash: { in: uniqueHashes },
        },
        select: {
          studentId: true,
          uniqueHash: true,
          punctuality: true,
          attentiveness: true,
          leadershipSkills: true,
          neatness: true,
          attendanceTotal: true,
          attendancePresent: true,
          attendanceAbsent: true,
          classTeacherComment: true,
          principalComment: true,
        },
      });

      // Create a map of term records by student ID
      const termRecordsMap = new Map();
      termRecords.forEach((record) => {
        termRecordsMap.set(record.studentId, record);
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

          // Get term record data for this student
          const termRecord = termRecordsMap.get(student.id);

          // Calculate student totals
          let totalScore = 0;
          let totalObtainable = 0;

          const subjects = Array.from(subjectsMap.values()).map((subject) => {
            const subjectResult = studentSubjectResults.find(
              (result) => result.subject.id === subject.id,
            );

            // Calculate correct obtainable score based on result scope and marking scheme
            const markingScheme = resultBatch.markingSchemeStructure as any;
            let obtainableScore = 0;

            if (markingScheme?.components) {
              if (resultBatch.resultScope === AssessmentType.CA) {
                // For CA: find the specific component that matches resultTypeId
                const targetComponent = markingScheme.components.find(
                  (comp: any) => comp.id === resultBatch.resultType.id,
                );
                obtainableScore = targetComponent?.score || 0;
              } else if (resultBatch.resultScope === AssessmentType.EXAM) {
                // For EXAM: sum all components (CA + EXAM)
                obtainableScore = markingScheme.components.reduce(
                  (sum: number, comp: any) => sum + (comp.score || 0),
                  0,
                );
              } else {
                // Default fallback
                obtainableScore = markingScheme.totalMarks || 100;
              }
            } else {
              // Fallback to totalMarks if components structure is not available
              obtainableScore = markingScheme?.totalMarks || 100;
            }

            if (subjectResult) {
              // For CA: only show the score for the specific CA component
              // For EXAM: show the total score (all components)
              let actualScore = subjectResult.totalScore;
              let actualObtainable = obtainableScore;

              if (resultBatch.resultScope === AssessmentType.CA) {
                // For CA, extract only the specific CA component score
                const componentScores = subjectResult.componentScores as any;
                const caComponentId = resultBatch.resultType.id;

                if (componentScores && componentScores[caComponentId]) {
                  actualScore = componentScores[caComponentId].total || 0;
                  actualObtainable =
                    componentScores[caComponentId].maxScore || obtainableScore;
                } else {
                  actualScore = 0;
                }
              }

              totalScore += actualScore;
              totalObtainable += actualObtainable;

              return {
                subject,
                totalScore: actualScore,
                obtainableScore: actualObtainable,
                position: subjectResult.position,
                grade: subjectResult.grade,
                comment: subjectResult.grade?.remark || '', // Use grade remark as comment
                componentScores: subjectResult.componentScores,
                percentage:
                  actualObtainable > 0
                    ? Math.round((actualScore / actualObtainable) * 100)
                    : 0,
              };
            }

            // For subjects with no results, still count the obtainable score
            totalObtainable += obtainableScore;

            return {
              subject,
              totalScore: 0,
              obtainableScore,
              position: null,
              grade: null,
              comment: '',
              componentScores: {},
              percentage: 0,
            };
          });

          // Calculate overall grade for the student
          const overallPercentage =
            totalObtainable > 0
              ? Math.round((totalScore / totalObtainable) * 100)
              : 0;

          // Student average should be the same as overall percentage
          const studentAverage = overallPercentage;

          const overallGrade = this.determineGrade(
            totalScore,
            totalObtainable,
            AssessmentType.EXAM, // Use EXAM type for overall grade calculation
            gradingSystem?.grades || [],
          );

          return {
            ...student,
            subjects,
            totalScore,
            totalObtainable,
            averageScore: studentAverage, // Use calculated percentage as average
            overallPercentage,
            overallGrade,
            // Behavioral data from StudentTermRecord
            behavioralData: termRecord
              ? {
                  punctuality: termRecord.punctuality,
                  attentiveness: termRecord.attentiveness,
                  leadershipSkills: termRecord.leadershipSkills,
                  neatness: termRecord.neatness,
                }
              : {},
            // Attendance data from StudentTermRecord
            attendanceData: termRecord
              ? {
                  total: termRecord.attendanceTotal || 0,
                  present: termRecord.attendancePresent || 0,
                  absent: termRecord.attendanceAbsent || 0,
                  percentage:
                    termRecord.attendanceTotal > 0
                      ? Math.round(
                          (termRecord.attendancePresent /
                            termRecord.attendanceTotal) *
                            100,
                        )
                      : 0,
                }
              : { total: 0, present: 0, absent: 0, percentage: 0 },
            // Comments from StudentTermRecord
            comments: termRecord
              ? {
                  classTeacher: termRecord.classTeacherComment || '',
                  principal: termRecord.principalComment || '',
                }
              : { classTeacher: '', principal: '' },
          };
        },
      );

      // Calculate overall positions based on percentage, then total score as tiebreaker
      studentsWithResults.sort((a, b) => {
        if (b.overallPercentage !== a.overallPercentage) {
          return b.overallPercentage - a.overallPercentage;
        }
        // If percentages are equal, use total score as tiebreaker
        return b.totalScore - a.totalScore;
      });
      studentsWithResults.forEach((student, index) => {
        student.overallPosition = index + 1;
      });

      // Calculate comprehensive class statistics
      const totalStudents = studentsWithResults.length;
      const totalSubjects = Array.from(subjectsMap.values()).length;

      // Calculate total obtainable and obtained scores for the class
      const totalClassObtainable = studentsWithResults.reduce(
        (sum, student) => sum + student.totalObtainable,
        0,
      );
      const totalClassObtained = studentsWithResults.reduce(
        (sum, student) => sum + student.totalScore,
        0,
      );

      // Calculate attendance statistics
      const attendanceStats = studentsWithResults.reduce(
        (acc, student) => {
          acc.totalDays += student.attendanceData.total;
          acc.presentDays += student.attendanceData.present;
          acc.absentDays += student.attendanceData.absent;
          return acc;
        },
        { totalDays: 0, presentDays: 0, absentDays: 0 },
      );

      // Calculate averages - use percentage-based calculation (include ALL students)
      const allStudentPercentages = studentsWithResults.map(
        (s) => s.averageScore,
      ); // Include ALL students

      const classAverageFromStudents =
        allStudentPercentages.length > 0
          ? Math.round(
              (allStudentPercentages.reduce(
                (sum, percentage) => sum + percentage,
                0,
              ) /
                allStudentPercentages.length) *
                100,
            ) / 100
          : 0;

      // Calculate subject-wise statistics
      const subjectStats = Array.from(subjectsMap.values()).map((subject) => {
        // Get ALL students for this subject (including those with 0 scores)
        const allSubjectResults = studentsWithResults.map((student) => {
          const subjectResult = student.subjects.find(
            (s) => s.subject.id === subject.id,
          );
          return subjectResult
            ? {
                totalScore: subjectResult.totalScore,
                percentage: subjectResult.percentage,
                obtainableScore: subjectResult.obtainableScore,
              }
            : {
                totalScore: 0,
                percentage: 0,
                obtainableScore:
                  studentsWithResults[0]?.subjects.find(
                    (s) => s.subject.id === subject.id,
                  )?.obtainableScore || 0,
              };
        });

        const totalScores = allSubjectResults.map((r) => r.totalScore);
        const percentages = allSubjectResults.map((r) => r.percentage);

        // Only get highest/lowest from students who have scores > 0
        const scoresWithValues = totalScores.filter((score) => score > 0);
        const highest =
          scoresWithValues.length > 0 ? Math.max(...scoresWithValues) : 0;
        const lowest =
          scoresWithValues.length > 0 ? Math.min(...scoresWithValues) : 0;

        // Average should consider ALL students (including those with 0)
        const averageScore =
          totalScores.length > 0
            ? Math.round(
                (totalScores.reduce((sum, score) => sum + score, 0) /
                  totalScores.length) *
                  100,
              ) / 100
            : 0;
        const averagePercentage =
          percentages.length > 0
            ? Math.round(
                (percentages.reduce((sum, perc) => sum + perc, 0) /
                  percentages.length) *
                  100,
              ) / 100
            : 0;

        return {
          subject,
          highest,
          lowest,
          averageScore,
          averagePercentage,
          totalStudents: allSubjectResults.length, // ALL students in class
          studentsWithScores: scoresWithValues.length, // Students who actually have scores
          obtainableScore:
            allSubjectResults.length > 0
              ? allSubjectResults[0].obtainableScore
              : 0,
        };
      });

      const classStats = {
        totalStudents,
        totalSubjects,
        totalObtainableScore: totalClassObtainable,
        totalObtainedScore: totalClassObtained,
        classPercentage:
          totalClassObtainable > 0
            ? Math.round((totalClassObtained / totalClassObtainable) * 100)
            : 0,
        highestScore:
          studentsWithResults.length > 0
            ? studentsWithResults[0].totalScore
            : 0,
        highestPercentage:
          studentsWithResults.length > 0
            ? studentsWithResults[0].overallPercentage
            : 0,
        lowestScore:
          studentsWithResults.length > 0
            ? studentsWithResults[studentsWithResults.length - 1].totalScore
            : 0,
        lowestPercentage:
          studentsWithResults.length > 0
            ? studentsWithResults[studentsWithResults.length - 1]
                .overallPercentage
            : 0,
        classAverage: Math.round(classAverageFromStudents * 100) / 100,
        // Attendance statistics
        attendance: {
          totalDays: attendanceStats.totalDays,
          totalPresent: attendanceStats.presentDays,
          totalAbsent: attendanceStats.absentDays,
          attendancePercentage:
            attendanceStats.totalDays > 0
              ? Math.round(
                  (attendanceStats.presentDays / attendanceStats.totalDays) *
                    100,
                )
              : 0,
        },
        // Subject-wise statistics
        subjectStats,
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
          termDefinition: {
            ...resultBatch.termDefinition,
            displayName: this.formatTermName(resultBatch.termDefinition.name), // Format term name
          },
          class: resultBatch.class,
          classArm: resultBatch.classArm,
          resultType: resultBatch.resultType,
        },
        markingSchemeStructure: resultBatch.markingSchemeStructure,
        students: studentsWithResults,
        subjects: Array.from(subjectsMap.values()),
        classStats,
        // Grading system with grades, ranges, and remarks
        gradingSystem: {
          id: gradingSystem?.id || 'default',
          name: gradingSystem?.name || 'Default Grading System',
          grades:
            gradingSystem?.grades?.map((grade) => ({
              id: grade.id,
              name: grade.name,
              remark: grade.remark,
              scoreRange: {
                min: grade.scoreStartPoint,
                max: grade.scoreEndPoint,
                display: `${grade.scoreStartPoint.toFixed(2)}-${grade.scoreEndPoint.toFixed(2)}`,
              },
            })) || [],
        },
        // Additional metadata for frontend
        metadata: {
          generatedAt: new Date(),
          totalRecords: studentsWithResults.length * totalSubjects,
          hasStudentTermRecords: termRecords.length > 0,
          gradingSystemId: gradingSystem?.id || null,
        },
      };
    } catch (error) {
      console.error('Error fetching result batch details', error);
      throw error;
    }
  }

  /**
   * Get result batch by ID with type-based response (grades or scores)
   * @param resultBatchId - The ID of the result batch
   * @param type - Either 'grades' or 'scores' to determine response format
   * @param req - Request object containing user information
   * @returns Formatted result data based on type
   */
  async getResultBatchByIdWithType(
    resultBatchId: string,
    type: 'grades' | 'scores',
    req: any,
  ) {
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
        },
      });

      if (!resultBatch) {
        throw new Error('Result batch not found or access denied');
      }

      // Get the grading system for determining grades
      const gradingSystem = await this.getGradingSystemForClass(
        resultBatch.class.id,
        schoolId,
      );

      // Get all student results for this batch
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
                  othername: true,
                  username: true,
                  gender: true,
                  avatar: true,
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
              remark: true,
            },
          },
        },
        orderBy: [
          { student: { user: { lastname: 'asc' } } },
          { student: { user: { firstname: 'asc' } } },
          { subject: { name: 'asc' } },
        ],
      });

      // Get all unique students with enhanced data
      const studentsMap = new Map();
      const studentIds = new Set<string>();

      studentResults.forEach((result) => {
        const studentId = result.student.id;
        studentIds.add(studentId);

        if (!studentsMap.has(studentId)) {
          // Calculate age from date of birth
          const age = result.student.dateOfBirth
            ? this.calculateAge(result.student.dateOfBirth)
            : null;

          studentsMap.set(studentId, {
            id: result.student.id,
            studentRegNo: result.student.studentRegNo,
            user: result.student.user,
            dateOfBirth: result.student.dateOfBirth,
            age,
            gender: result.student.user.gender,
            subjects: [],
            totalScore: 0,
            averageScore: 0,
            overallPosition: 0,
            overallGrade: null,
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

      // Calculate obtainable score based on marking scheme
      const markingScheme = resultBatch.markingSchemeStructure as any;
      let obtainableScorePerSubject = 0;

      if (markingScheme?.components) {
        if (resultBatch.resultScope === AssessmentType.CA) {
          // For CA: find the specific component that matches resultTypeId
          const targetComponent = markingScheme.components.find(
            (comp: any) => comp.id === resultBatch.resultType.id,
          );
          obtainableScorePerSubject = targetComponent?.score || 0;
        } else if (resultBatch.resultScope === AssessmentType.EXAM) {
          // For EXAM: sum all components
          obtainableScorePerSubject = markingScheme.components.reduce(
            (sum: number, comp: any) => sum + (comp.score || 0),
            0,
          );
        } else {
          obtainableScorePerSubject = markingScheme.totalMarks || 100;
        }
      } else {
        obtainableScorePerSubject = markingScheme?.totalMarks || 100;
      }

      // Organize results by student and subject
      const studentsWithResults = Array.from(studentsMap.values()).map(
        (student) => {
          const studentSubjectResults = studentResults.filter(
            (result) => result.student.id === student.id,
          );

          let totalScore = 0;
          let totalObtainable = 0;

          const subjects = Array.from(subjectsMap.values()).map((subject) => {
            const subjectResult = studentSubjectResults.find(
              (result) => result.subject.id === subject.id,
            );

            if (subjectResult) {
              // For CA: only show the score for the specific CA component
              // For EXAM: show the total score (all components)
              let subjectScore = subjectResult.totalScore;
              let subjectObtainable = obtainableScorePerSubject;

              if (resultBatch.resultScope === AssessmentType.CA) {
                // For CA, extract only the specific CA component score
                const componentScores = subjectResult.componentScores as any;
                const caComponentId = resultBatch.resultType.id; // This is the specific CA component ID

                if (componentScores && componentScores[caComponentId]) {
                  subjectScore = componentScores[caComponentId].total || 0;
                  subjectObtainable =
                    componentScores[caComponentId].maxScore ||
                    obtainableScorePerSubject;
                } else {
                  subjectScore = 0;
                  subjectObtainable = obtainableScorePerSubject;
                }
              }

              totalScore += subjectScore;
              totalObtainable += subjectObtainable;

              if (type === 'grades') {
                // Calculate grade based on the actual score for this component
                const componentGrade = this.determineGrade(
                  subjectScore,
                  subjectObtainable,
                  resultBatch.resultScope,
                  gradingSystem?.grades || [],
                );

                return {
                  subject,
                  grade: componentGrade,
                  totalScore: subjectScore,
                  obtainableScore: subjectObtainable,
                  position: subjectResult.position,
                };
              } else {
                return {
                  subject,
                  totalScore: subjectScore,
                  obtainableScore: subjectObtainable,
                  position: subjectResult.position,
                };
              }
            }

            // For subjects with no results
            totalObtainable += obtainableScorePerSubject;

            if (type === 'grades') {
              return {
                subject,
                grade: null,
                totalScore: 0,
                obtainableScore: obtainableScorePerSubject,
                position: null,
              };
            } else {
              return {
                subject,
                totalScore: 0,
                obtainableScore: obtainableScorePerSubject,
                position: null,
              };
            }
          });

          // Calculate overall percentage and grade
          const overallPercentage =
            totalObtainable > 0
              ? Math.round((totalScore / totalObtainable) * 100)
              : 0;

          const overallGrade = this.determineGrade(
            totalScore,
            totalObtainable,
            AssessmentType.EXAM,
            gradingSystem?.grades || [],
          );

          return {
            id: student.id,
            studentRegNo: student.studentRegNo,
            firstname: student.user.firstname,
            lastname: student.user.lastname,
            othername: student.user.othername,
            age: student.age,
            gender: student.gender,
            subjects,
            totalScore,
            averageScore: overallPercentage,
            overallGrade: overallGrade, // Include overall grade for both types
            overallPosition: 0, // Will be calculated after sorting
          };
        },
      );

      // Calculate overall positions
      studentsWithResults.sort((a, b) => {
        if (b.averageScore !== a.averageScore) {
          return b.averageScore - a.averageScore;
        }
        return b.totalScore - a.totalScore;
      });
      studentsWithResults.forEach((student, index) => {
        student.overallPosition = index + 1;
      });

      // Calculate subject-wise statistics
      const subjectStats = Array.from(subjectsMap.values()).map((subject) => {
        // Get ALL students for this subject (including those with 0 scores)
        const allSubjectResults = studentsWithResults.map((student) => {
          const subjectData = student.subjects.find(
            (s) => s.subject.id === subject.id,
          );
          return subjectData
            ? subjectData
            : {
                totalScore: 0,
                obtainableScore: obtainableScorePerSubject,
                grade: null,
                position: null,
              };
        });

        // Separate students with scores > 0 from all students
        const resultsWithScores = allSubjectResults.filter(
          (result) => result.totalScore > 0,
        );

        if (type === 'grades') {
          // For grades type: return grade statistics
          const scores = allSubjectResults.map((r) => r.totalScore); // Include ALL students
          const scoresWithValues = resultsWithScores.map((r) => r.totalScore); // Only students with scores > 0
          const avgObtainable = obtainableScorePerSubject;

          const allPercentages = scores.map(
            (score) => (score / avgObtainable) * 100,
          );
          const percentagesWithValues = scoresWithValues.map(
            (score) => (score / avgObtainable) * 100,
          );

          // Find highest and lowest grades based on percentage (only from students with scores)
          let highestGrade = null;
          let lowestGrade = null;
          let averageGrade = null;

          if (allPercentages.length > 0) {
            // Highest and lowest from students with actual scores
            const highestPercentage =
              percentagesWithValues.length > 0
                ? Math.max(...percentagesWithValues)
                : 0;
            const lowestPercentage =
              percentagesWithValues.length > 0
                ? Math.min(...percentagesWithValues)
                : 0;

            // Average considers ALL students (including those with 0)
            const avgPercentage =
              allPercentages.reduce((sum, p) => sum + p, 0) /
              allPercentages.length;

            if (percentagesWithValues.length > 0) {
              highestGrade = this.determineGrade(
                (highestPercentage / 100) * avgObtainable,
                avgObtainable,
                resultBatch.resultScope,
                gradingSystem?.grades || [],
              );

              lowestGrade = this.determineGrade(
                (lowestPercentage / 100) * avgObtainable,
                avgObtainable,
                resultBatch.resultScope,
                gradingSystem?.grades || [],
              );
            }

            averageGrade = this.determineGrade(
              (avgPercentage / 100) * avgObtainable,
              avgObtainable,
              resultBatch.resultScope,
              gradingSystem?.grades || [],
            );
          }

          return {
            subject,
            highestGrade,
            lowestGrade,
            averageGrade,
            totalStudents: allSubjectResults.length, // ALL students in class
            studentsWithScores: resultsWithScores.length, // Students who actually have scores
            obtainableScore: avgObtainable,
          };
        } else {
          // For scores type: return score statistics
          const allScores = allSubjectResults.map((r) => r.totalScore); // Include ALL students
          const scoresWithValues = resultsWithScores.map((r) => r.totalScore); // Only students with scores > 0
          const avgObtainable = obtainableScorePerSubject;

          // Highest and lowest from students with actual scores
          const highestScore =
            scoresWithValues.length > 0 ? Math.max(...scoresWithValues) : 0;
          const lowestScore =
            scoresWithValues.length > 0 ? Math.min(...scoresWithValues) : 0;

          // Average considers ALL students (including those with 0)
          const averageScore =
            allScores.length > 0
              ? Math.round(
                  (allScores.reduce((sum, score) => sum + score, 0) /
                    allScores.length) *
                    100,
                ) / 100
              : 0;

          return {
            subject,
            highestScore,
            lowestScore,
            averageScore,
            totalStudents: allSubjectResults.length, // ALL students in class
            studentsWithScores: resultsWithScores.length, // Students who actually have scores
            obtainableScore: avgObtainable,
          };
        }
      });

      return {
        resultBatch: {
          id: resultBatch.id,
          title: resultBatch.title,
          resultScope: resultBatch.resultScope,
          session: resultBatch.session,
          termDefinition: {
            ...resultBatch.termDefinition,
            displayName: this.formatTermName(resultBatch.termDefinition.name),
          },
          class: resultBatch.class,
          classArm: resultBatch.classArm,
          resultType: resultBatch.resultType,
        },
        type, // Include the type in response
        students: studentsWithResults,
        subjects: Array.from(subjectsMap.values()),
        subjectStats,
        classStats: {
          totalStudents: studentsWithResults.length,
          totalSubjects: Array.from(subjectsMap.values()).length,
        },
        metadata: {
          generatedAt: new Date(),
          responseType: type,
        },
      };
    } catch (error) {
      console.error('Error fetching result batch details by type', error);
      throw error;
    }
  }

  /**
   * Format term name for display (e.g., "first_term" → "First Term")
   */
  private formatTermName(termName: string): string {
    if (!termName) return '';
    return termName
      .split('_')
      .map((word) => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
      .join(' ');
  }

  /**
   * Calculate age from date of birth
   */
  private calculateAge(dateOfBirth: Date): number {
    if (!dateOfBirth) return null;
    const today = new Date();
    const birthDate = new Date(dateOfBirth);
    let age = today.getFullYear() - birthDate.getFullYear();
    const monthDiff = today.getMonth() - birthDate.getMonth();

    if (
      monthDiff < 0 ||
      (monthDiff === 0 && today.getDate() < birthDate.getDate())
    ) {
      age--;
    }

    return age;
  }

  /**
   * Generate student transcript by class category
   * Returns all results for a student across all classes and terms in a specific category
   * @param classCategoryId - The ID of the class category (e.g., Junior, Senior)
   * @param studentIdentifier - Student's full name or registration number
   * @param req - Request object containing user information
   * @returns Complete transcript data for the student
   */
  async getStudentTranscriptByCategory(
    classCategoryId: string,
    studentIdentifier: string,
    req: any,
  ) {
    try {
      const schoolId = req.user.schoolId;

      // Find the student by name or registration number
      const student = await this.findStudentByIdentifier(studentIdentifier);

      if (!student) {
        throw new Error('Student not found');
      }

      // Get all classes in the specified category
      const classesInCategory = await this.prisma.class.findMany({
        where: {
          classCategoryId,
          schoolId,
          isDeleted: false,
        },
        include: {
          classCategory: {
            select: {
              id: true,
              name: true,
            },
          },
        },
        orderBy: {
          name: 'asc',
        },
      });

      if (classesInCategory.length === 0) {
        throw new Error('No classes found in this category');
      }

      // Remove unused variables since we're not implementing full functionality yet
      // const sessions = await this.prisma.session.findMany({
      //   where: {
      //     schoolId,
      //   },
      //   orderBy: {
      //     name: 'asc',
      //   },
      // });

      // Get all term definitions
      // const termDefinitions = await this.prisma.termDefinition.findMany({
      //   where: {
      //     schoolId,
      //   },
      //   orderBy: {
      //     name: 'asc',
      //   },
      // });

      // Get student's class assignments in this category
      // const studentClassAssignments =
      //   await this.prisma.studentClassAssignment.findMany({
      //     where: {
      //       studentId: student.id,
      //       classId: { in: classesInCategory.map((c) => c.id) },
      //       schoolId,
      //       isActive: true,
      //     },
      //     include: {
      //       session: {
      //         select: { id: true, name: true },
      //       },
      //       class: {
      //         select: { id: true, name: true },
      //       },
      //       classArm: {
      //         select: { id: true, name: true },
      //       },
      //     },
      //     orderBy: [{ session: { name: 'asc' } }, { class: { name: 'asc' } }],
      //   });

      // Get all result batches for this student in the category
      const resultBatches = await this.prisma.resultBatch.findMany({
        where: {
          classId: { in: classesInCategory.map((c) => c.id) },
          schoolId,
          // isApproved: true, // Only approved results
          studentResults: {
            some: {
              studentId: student.id,
            },
          },
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
          studentResults: {
            where: {
              studentId: student.id,
            },
            include: {
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
                  remark: true,
                },
              },
            },
          },
        },
        orderBy: [
          { session: { name: 'asc' } },
          { class: { name: 'asc' } },
          { termDefinition: { name: 'asc' } },
          { resultScope: 'asc' },
        ],
      });

      // Get all subjects offered in this category by the student
      const allSubjects = new Set();
      const subjectsMap = new Map();

      // Collect all subjects from result batches
      resultBatches.forEach((batch) => {
        if (batch.studentResults && Array.isArray(batch.studentResults)) {
          batch.studentResults.forEach((result) => {
            if (!subjectsMap.has(result.subject.id)) {
              subjectsMap.set(result.subject.id, result.subject);
              allSubjects.add(result.subject);
            }
          });
        }
      }); // Structure the transcript data
      const transcriptData = await this.buildTranscriptStructure(
        student,
        resultBatches,
      );

      return {
        student: {
          id: student.id,
          studentRegNo: student.studentRegNo,
          firstname: student.user.firstname,
          lastname: student.user.lastname,
          othername: student.user.othername,
          fullName: `${student.user.firstname} ${student.user.lastname}${
            student.user.othername ? ` ${student.user.othername}` : ''
          }`,
          dateOfBirth: student.dateOfBirth,
          age: student.dateOfBirth
            ? this.calculateAge(student.dateOfBirth)
            : null,
          gender: student.user.gender,
          nationality: student.nationality,
          avatar: student.user.avatar,
        },
        classCategory: classesInCategory[0].classCategory,
        totalSubjects: Array.from(subjectsMap.values()).length,
        subjects: Array.from(subjectsMap.values()),
        transcriptData,
        metadata: {
          generatedAt: new Date(),
          totalSessions: transcriptData.length,
          totalClasses: classesInCategory.length,
          totalTermsProcessed: transcriptData.reduce(
            (sum, session) =>
              sum +
              session.classes.reduce(
                (classSum, cls) => classSum + cls.terms.length,
                0,
              ),
            0,
          ),
        },
      };
    } catch (error) {
      console.error('Error generating student transcript', error);
      throw error;
    }
  }

  /**
   * Find student by name or registration number
   */
  private async findStudentByIdentifier(
    identifier: string,
  ): Promise<any | null> {
    // Try to find by registration number first
    let student = await this.prisma.student.findFirst({
      where: {
        studentRegNo: identifier,
      },
      include: {
        user: {
          select: {
            id: true,
            firstname: true,
            lastname: true,
            othername: true,
            gender: true,
            avatar: true,
          },
        },
      },
    });

    if (student) {
      return student;
    }

    // If not found by reg number, try to find by full name
    const nameParts = identifier.trim().split(/\s+/);
    if (nameParts.length >= 2) {
      const firstname = nameParts[0];
      const lastname = nameParts[nameParts.length - 1];
      const othername =
        nameParts.length > 2 ? nameParts.slice(1, -1).join(' ') : null;

      student = await this.prisma.student.findFirst({
        where: {
          user: {
            firstname: {
              equals: firstname,
            },
            lastname: {
              equals: lastname,
            },
            ...(othername && {
              othername: {
                equals: othername,
              },
            }),
          },
        },
        include: {
          user: {
            select: {
              id: true,
              firstname: true,
              lastname: true,
              othername: true,
              gender: true,
              avatar: true,
            },
          },
        },
      });
    }

    return student;
  }

  /**
   * Build the transcript structure grouped by session, class, term, and subject
   */
  private async buildTranscriptStructure(student: any, resultBatches: any[]) {
    const transcriptStructure = [];

    // Group result batches by session
    const sessionGroups = new Map();
    resultBatches.forEach((batch) => {
      const sessionId = batch.session.id;
      if (!sessionGroups.has(sessionId)) {
        sessionGroups.set(sessionId, {
          session: batch.session,
          batches: [],
        });
      }
      sessionGroups.get(sessionId).batches.push(batch);
    });

    // Process each session
    for (const [, sessionData] of sessionGroups) {
      const sessionStructure = {
        session: sessionData.session,
        classes: [],
        sessionSummary: {
          totalSubjects: 0,
          totalObtained: 0,
          totalObtainable: 0,
          averagePercentage: 0,
        },
      };

      // Group batches by class within the session
      const classGroups = new Map();
      sessionData.batches.forEach((batch) => {
        const classId = batch.class.id;
        if (!classGroups.has(classId)) {
          classGroups.set(classId, {
            class: batch.class,
            classArm: batch.classArm,
            batches: [],
          });
        }
        classGroups.get(classId).batches.push(batch);
      });

      // Process each class in the session
      for (const [, classData] of classGroups) {
        const classStructure = {
          class: classData.class,
          classArm: classData.classArm,
          terms: [],
          classSummary: {
            totalSubjects: 0,
            totalObtained: 0,
            totalObtainable: 0,
            averagePercentage: 0,
          },
        };

        // Group batches by term within the class
        const termGroups = new Map();
        classData.batches.forEach((batch) => {
          const termId = batch.termDefinition.id;
          if (!termGroups.has(termId)) {
            termGroups.set(termId, {
              termDefinition: batch.termDefinition,
              batches: [],
            });
          }
          termGroups.get(termId).batches.push(batch);
        });

        // Process each term in the class
        for (const [, termData] of termGroups) {
          const termStructure = {
            termDefinition: {
              ...termData.termDefinition,
              displayName: this.formatTermName(termData.termDefinition.name),
            },
            subjects: [],
            termSummary: {
              totalObtained: 0,
              totalObtainable: 0,
              totalSubjects: 0,
              averagePercentage: 0,
            },
          };

          // Calculate term totals by combining all assessment types (CA + EXAM)
          const subjectScoresMap = new Map();

          // Process each batch in the term
          termData.batches.forEach((batch) => {
            const markingScheme = batch.markingSchemeStructure as any;

            batch.studentResults.forEach((result) => {
              const subjectId = result.subject.id;

              if (!subjectScoresMap.has(subjectId)) {
                subjectScoresMap.set(subjectId, {
                  subject: result.subject,
                  totalScore: 0,
                  obtainableScore: 0,
                  assessments: [],
                  grade: null,
                });
              }

              const subjectData = subjectScoresMap.get(subjectId);

              // For terminal (EXAM) results, this includes all components (CA + EXAM)
              // For CA results, this includes only the specific CA component
              let actualScore = result.totalScore;
              let actualObtainable = markingScheme?.totalMarks || 100;

              if (batch.resultScope === AssessmentType.CA) {
                // For CA, get only the specific CA component score
                const componentScores = result.componentScores as any;
                const caComponentId = batch.resultType.id;

                if (componentScores && componentScores[caComponentId]) {
                  actualScore = componentScores[caComponentId].total || 0;
                  actualObtainable =
                    componentScores[caComponentId].maxScore || actualObtainable;
                } else {
                  actualScore = 0;
                }
              }

              // Only add to total if this is EXAM (terminal) result to avoid double counting
              if (batch.resultScope === AssessmentType.EXAM) {
                subjectData.totalScore = actualScore;
                subjectData.obtainableScore = actualObtainable;
                subjectData.grade = result.grade;
              }

              // Add assessment details
              subjectData.assessments.push({
                type: batch.resultScope,
                resultType: batch.resultType,
                score: actualScore,
                obtainable: actualObtainable,
                percentage:
                  actualObtainable > 0
                    ? Math.round((actualScore / actualObtainable) * 100)
                    : 0,
                grade: result.grade,
              });
            });
          });

          // Convert subject scores to array and calculate totals
          let termTotalObtained = 0;
          let termTotalObtainable = 0;
          let subjectsWithScores = 0;

          Array.from(subjectScoresMap.values()).forEach((subjectData) => {
            if (subjectData.totalScore > 0 || subjectData.obtainableScore > 0) {
              termTotalObtained += subjectData.totalScore;
              termTotalObtainable += subjectData.obtainableScore;
              subjectsWithScores++;

              termStructure.subjects.push({
                subject: subjectData.subject,
                totalScore: subjectData.totalScore,
                obtainableScore: subjectData.obtainableScore,
                percentage:
                  subjectData.obtainableScore > 0
                    ? Math.round(
                        (subjectData.totalScore / subjectData.obtainableScore) *
                          100,
                      )
                    : 0,
                grade: subjectData.grade,
                assessments: subjectData.assessments,
              });
            }
          });

          // Calculate term summary
          termStructure.termSummary = {
            totalObtained: termTotalObtained,
            totalObtainable: termTotalObtainable,
            totalSubjects: subjectsWithScores,
            averagePercentage:
              termTotalObtainable > 0
                ? Math.round(
                    (termTotalObtained / termTotalObtainable) * 100 * 100,
                  ) / 100
                : 0,
          };

          // Add term to class if it has subjects
          if (termStructure.subjects.length > 0) {
            classStructure.terms.push(termStructure);

            // Update class summary
            classStructure.classSummary.totalObtained += termTotalObtained;
            classStructure.classSummary.totalObtainable += termTotalObtainable;
            classStructure.classSummary.totalSubjects += subjectsWithScores;
          }
        }

        // Calculate class average
        if (classStructure.classSummary.totalObtainable > 0) {
          classStructure.classSummary.averagePercentage =
            Math.round(
              (classStructure.classSummary.totalObtained /
                classStructure.classSummary.totalObtainable) *
                100 *
                100,
            ) / 100;
        }

        // Add class to session if it has terms
        if (classStructure.terms.length > 0) {
          sessionStructure.classes.push(classStructure);

          // Update session summary
          sessionStructure.sessionSummary.totalObtained +=
            classStructure.classSummary.totalObtained;
          sessionStructure.sessionSummary.totalObtainable +=
            classStructure.classSummary.totalObtainable;
          sessionStructure.sessionSummary.totalSubjects +=
            classStructure.classSummary.totalSubjects;
        }
      }

      // Calculate session average
      if (sessionStructure.sessionSummary.totalObtainable > 0) {
        sessionStructure.sessionSummary.averagePercentage =
          Math.round(
            (sessionStructure.sessionSummary.totalObtained /
              sessionStructure.sessionSummary.totalObtainable) *
              100 *
              100,
          ) / 100;
      }

      // Add session to transcript if it has classes
      if (sessionStructure.classes.length > 0) {
        transcriptStructure.push(sessionStructure);
      }
    }

    return transcriptStructure;
  }

  /**
   * Get all students with their term averages and promotion status
   * @param sessionId - Current session ID
   * @param classId - Class ID
   * @param classArmId - Class arm ID
   * @param req - Request object containing user information
   * @returns Student list with term averages and promotion status
   */
  async getStudentsForPromotion(
    sessionId: string,
    classId: string,
    classArmId: string,
    req: any,
  ) {
    try {
      const schoolId = req.user.schoolId;

      // Get all students in the class arm for the session
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
              include: {
                user: {
                  select: {
                    id: true,
                    firstname: true,
                    lastname: true,
                    othername: true,
                    gender: true,
                  },
                },
              },
            },
          },
        });

      // Get all term definitions for the session
      const termDefinitions = await this.prisma.termDefinition.findMany({
        where: {
          schoolId,
        },
        orderBy: {
          createdAt: 'asc',
        },
        take: 3, // Assuming first, second, third terms
      });

      if (termDefinitions.length < 3) {
        throw new Error('Session must have at least 3 term definitions');
      }

      const studentsWithResults = [];

      for (const assignment of studentClassAssignments) {
        const student = assignment.student;
        const termAverages = [];
        let totalCumulative = 0;
        let validTermsCount = 0;

        // Calculate average for each term
        for (const term of termDefinitions) {
          // Find result batches for this student, term, and class (EXAM scope only)
          const resultBatches = await this.prisma.resultBatch.findMany({
            where: {
              sessionId,
              termId: term.id,
              classId,
              classArmId,
              resultScope: 'EXAM', // Only consider EXAM results for promotion
              schoolId,
              // isApproved: true,
            },
          });

          let termTotal = 0;
          let termObtainable = 0;
          let hasResults = false;

          // Get student results for all subjects in this term
          for (const batch of resultBatches) {
            const studentResults = await this.prisma.studentResult.findMany({
              where: {
                resultBatchId: batch.id,
                studentId: student.id,
                schoolId,
              },
            });

            for (const result of studentResults) {
              termTotal += result.totalScore;

              // Calculate obtainable score from marking scheme
              const markingScheme = batch.markingSchemeStructure as any;
              const obtainableScore = markingScheme?.totalMarks || 100;
              termObtainable += obtainableScore;
              hasResults = true;
            }
          }

          // Calculate term average
          const termAverage =
            hasResults && termObtainable > 0
              ? Math.round((termTotal / termObtainable) * 100 * 100) / 100
              : 0;

          termAverages.push(termAverage);

          if (hasResults && termAverage > 0) {
            totalCumulative += termAverage;
            validTermsCount++;
          }
        }

        // Calculate cumulative average
        const cumulativeAverage =
          validTermsCount > 0
            ? Math.round((totalCumulative / 3) * 100) / 100
            : 0;

        // Determine promotion status (>= 45 for promotion)
        const promotionStatus = cumulativeAverage >= 45;

        studentsWithResults.push({
          id: student.id,
          fullName:
            `${student.user.lastname} ${student.user.firstname} ${student.user.othername || ''}`.trim(),
          admissionNumber: student.studentRegNo,
          gender: student.user.gender,
          firstTermAverage: termAverages[0] || 0,
          secondTermAverage: termAverages[1] || 0,
          thirdTermAverage: termAverages[2] || 0,
          cumulativeResult: cumulativeAverage,
          promotionStatus,
        });
      }

      // Sort by full name
      studentsWithResults.sort((a, b) => a.fullName.localeCompare(b.fullName));

      return {
        sessionId,
        classId,
        classArmId,
        totalStudents: studentsWithResults.length,
        studentsEligibleForPromotion: studentsWithResults.filter(
          (s) => s.promotionStatus,
        ).length,
        students: studentsWithResults,
      };
    } catch (error) {
      console.error('Error fetching students for promotion', error);
      throw error;
    }
  }

  /**
   * Promote students to new session/class
   * @param promotionData - Array of student promotion data
   * @param req - Request object containing user information
   * @returns Promotion results
   */
  async promoteStudents(
    promotionData: {
      studentId: string;
      promoteAction: boolean;
    }[],
    newSessionId: string,
    newClassId: string,
    newClassArmId: string,
    currentSessionId: string,
    currentClassId: string,
    currentClassArmId: string,
    graduatingClass: boolean = false,
    req: any,
  ) {
    try {
      const schoolId = req.user.schoolId;

      // Validate sessions exist and new session is in future
      const [currentSession, newSession] = await Promise.all([
        this.prisma.session.findUnique({
          where: { id: currentSessionId, schoolId },
        }),
        this.prisma.session.findUnique({
          where: { id: newSessionId, schoolId },
        }),
      ]);

      if (!currentSession || !newSession) {
        throw new Error('Invalid session IDs');
      }

      // Validate new class and class arm
      const [newClass, newClassArm] = await Promise.all([
        this.prisma.class.findUnique({
          where: { id: newClassId, schoolId },
        }),
        this.prisma.classArm.findUnique({
          where: { id: newClassArmId, schoolId },
        }),
      ]);

      if (!newClass || !newClassArm) {
        throw new Error('Invalid new class or class arm');
      }

      const results = {
        promoted: 0,
        retained: 0,
        graduated: 0,
        errors: [] as string[],
      };

      // Process each student
      for (const studentPromotion of promotionData) {
        try {
          await this.prisma.$transaction(async (tx) => {
            const student = await tx.student.findUnique({
              where: { id: studentPromotion.studentId },
            });

            if (!student) {
              results.errors.push(
                `Student ${studentPromotion.studentId} not found`,
              );
              return;
            }

            if (graduatingClass) {
              // Mark student as alumni
              await tx.student.update({
                where: { id: studentPromotion.studentId },
                data: {
                  isAlumni: true,
                  updatedBy: req.user.id,
                },
              });

              // Deactivate current class assignment
              await tx.studentClassAssignment.updateMany({
                where: {
                  studentId: studentPromotion.studentId,
                  sessionId: currentSessionId,
                  classId: currentClassId,
                  classArmId: currentClassArmId,
                  schoolId,
                },
                data: {
                  isActive: false,
                  updatedBy: req.user.id,
                },
              });

              results.graduated++;
            } else {
              // Determine target class and class arm based on promote action
              const targetClassId = studentPromotion.promoteAction
                ? newClassId
                : currentClassId;
              const targetClassArmId = studentPromotion.promoteAction
                ? newClassArmId
                : currentClassArmId;

              // Deactivate current class assignment
              await tx.studentClassAssignment.updateMany({
                where: {
                  studentId: studentPromotion.studentId,
                  sessionId: currentSessionId,
                  classId: currentClassId,
                  classArmId: currentClassArmId,
                  schoolId,
                },
                data: {
                  isActive: false,
                  updatedBy: req.user.id,
                },
              });

              // Create new class assignment for new session
              await tx.studentClassAssignment.create({
                data: {
                  studentId: studentPromotion.studentId,
                  sessionId: newSessionId,
                  classId: targetClassId,
                  classArmId: targetClassArmId,
                  schoolId,
                  isActive: true,
                  createdBy: req.user.id,
                },
              });

              // Update student's current class and class arm
              await tx.student.update({
                where: { id: studentPromotion.studentId },
                data: {
                  classId: targetClassId,
                  classArmId: targetClassArmId,
                  updatedBy: req.user.id,
                },
              });

              // Get subjects for the target class and class arm
              const classArmSubjects =
                await tx.classArmSubjectAssignment.findMany({
                  where: {
                    classId: targetClassId,
                    classArmId: targetClassArmId,
                    schoolId,
                    isActive: true,
                  },
                });

              // Create student subject assignments
              if (classArmSubjects.length > 0) {
                const studentSubjectAssignments = classArmSubjects.map(
                  (classArmSubject) => ({
                    studentId: studentPromotion.studentId,
                    subjectId: classArmSubject.subjectId,
                    sessionId: newSessionId,
                    schoolId,
                    classArmSubjectId: classArmSubject.id,
                    createdBy: req.user.id,
                  }),
                );

                await tx.studentSubjectAssignment.createMany({
                  data: studentSubjectAssignments,
                });
              }

              if (studentPromotion.promoteAction) {
                results.promoted++;
              } else {
                results.retained++;
              }
            }
          });
        } catch (error) {
          console.error(
            `Error processing student ${studentPromotion.studentId}:`,
            error,
          );
          results.errors.push(
            `Error processing student ${studentPromotion.studentId}: ${error.message}`,
          );
        }
      }

      return {
        success: true,
        message: 'Student promotion completed',
        results,
      };
    } catch (error) {
      console.error('Error promoting students', error);
      throw error;
    }
  }
}
