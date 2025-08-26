// import { Injectable } from '@nestjs/common';
// import { CreateLessonPlan } from './dto/less-plan.dto';
// import { AuthenticatedUser } from '@/types/express';
// import { PrismaService } from '@/prisma/prisma.service';

// @Injectable()
// export class LessonPlanService {

//       constructor(private prisma: PrismaService) {}

//     async createLessonPlan(body: CreateLessonPlan, user: AuthenticatedUser){
//         const schoolId = user.schoolId

//         try {
//             const plan = await this.prisma.lessonPlan.create({
//                 data: {
//                     class: {connect: {id: body.classId}},
//                     school: {connect: {id: schoolId}},
//                     subject: {connect: {id: body.subjectId}},
//                     session: {connect: {id: body.sessionId}},
//                     term: {connect: {id: body.termId}}
//                 }
//             })   
//         } catch (error) {
            
//         }

//     }
// }


import { Injectable, BadRequestException, NotFoundException, UnauthorizedException, InternalServerErrorException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateLessonPlan } from './dto/less-plan.dto';
import { AuthenticatedUser } from '@/types/express';
import { LessonPlanType, Prisma } from '@prisma/client';


@Injectable()
export class LessonPlanService {
  constructor(private prisma: PrismaService) {}

  async createLessonPlan(body: CreateLessonPlan, user: AuthenticatedUser) {
    const schoolId = user.schoolId;

    try {
      // Validate referenced records
      const week = await this.prisma.weeks.findUnique({
        where: { id: body.weekId },
      });
      if (!week) {
        throw new NotFoundException(`Week with ID ${body.weekId} not found`);
      }

      if (body.classArmId) {
        const classArm = await this.prisma.classArm.findUnique({
          where: { id: body.classArmId },
        });
        if (!classArm) {
          throw new NotFoundException(`ClassArm with ID ${body.classArmId} not found`);
        }
      }

      const plan = await this.prisma.lessonPlan.create({
        data: {
          school: { connect: { id: schoolId } },
          term: { connect: { id: body.termId } },
          session: { connect: { id: body.sessionId } },
          subject: body.subjectId ? { connect: { id: body.subjectId } } : undefined,
          class: body.classId ? { connect: { id: body.classId } } : undefined,
          classArm: body.classArmId ? { connect: { id: body.classArmId } } : undefined,
          week: { connect: { id: body.weekId } },
          title: body.topic,
          description: body.subTopic,
          date: body.date,
          period: body.period,
          duration: body.duration,
          step: body.step,
          teacherActivity: body.teacherActivity,
          createdBy: user.id,
          updatedBy: user.id,
        },
      });

      return plan;
    } catch (error) {
      if (error.code === 'P2002') {
        throw new BadRequestException('A lesson plan with these details already exists');
      }
      if (error.code === 'P2025') {
        throw new NotFoundException('One or more referenced records (school, term, session, subject, class, classArm, or week) not found');
      }
      throw new BadRequestException(`Failed to create lesson plan: ${error.message}`);
    }
  }

  async schoolLessonPlan(
    schoolId: string,
    filters: {
      subjectId?: string;
      termId?: string;
      sessionId?: string;
      classId?: string;
    } = {},
  ) {
    try {
      // Validate school existence
      const school = await this.prisma.school.findUnique({
        where: { id: schoolId },
      });
      if (!school) {
        throw new UnauthorizedException('Unauthorized request: School not found');
      }

      // Build dynamic where clause based on provided filters
      const where: Prisma.LessonPlanWhereInput = {
        schoolId,
        isDeleted: false, // Only fetch non-deleted lesson plans
        ...(filters.subjectId && { subjectId: filters.subjectId }),
        ...(filters.termId && { termId: filters.termId }),
        ...(filters.sessionId && { sessionId: filters.sessionId }),
        ...(filters.classId && { classId: filters.classId }),
      };

      // Fetch lesson plans with related data
      const lessonPlans = await this.prisma.lessonPlan.findMany({
        where,
        include: {
          subject: {
            select: {
              id: true,
              name: true,
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
          term: {
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
        },
        orderBy: {
          createdAt: 'desc', // Optional: Sort by creation date
        },
      });

      // Check if any lesson plans were found
      if (!lessonPlans || lessonPlans.length === 0) {
        throw new NotFoundException('No lesson plans found for the specified criteria');
      }

      return lessonPlans;
    } catch (error) {
      // Handle Prisma-specific errors or other unexpected issues
      if (error instanceof Prisma.PrismaClientKnownRequestError) {
        throw new InternalServerErrorException('Database error occurred');
      }
      throw error; // Re-throw other errors (e.g., UnauthorizedException, NotFoundException)
    }
  }

  // get school lession plan by id for tern in a session 
  async schoolLessonPlanById(
    schoolId: string,
    lessonPlanId: string,
    filters: {
      sessionId?: string;
      termId?: string;
      subjectId?: string;
      classId?: string;
    } = {},
  ) {
    try {
      // Validate school existence
      const school = await this.prisma.school.findUnique({
        where: { id: schoolId },
      });
      if (!school) {
        throw new UnauthorizedException('Unauthorized request: School not found');
      }

      // Build where clause
      const where: Prisma.LessonPlanWhereInput = {
        id: lessonPlanId,
        schoolId,
        isDeleted: false,
        ...(filters.sessionId && { sessionId: filters.sessionId }),
        ...(filters.termId && { termId: filters.termId }),
        ...(filters.subjectId && { subjectId: filters.subjectId }),
        ...(filters.classId && { classId: filters.classId }),
      };

      // Fetch lesson plan with related data
      const lessonPlan = await this.prisma.lessonPlan.findFirst({
        where,
        include: {
          subject: {
            select: {
              id: true,
              name: true,
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
          term: {
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
        },
      });

      if (!lessonPlan) {
        throw new NotFoundException('Lesson plan not found for the specified criteria');
      }

      return lessonPlan;
    } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError) {
        throw new InternalServerErrorException('Database error occurred');
      }
      throw error;
    }
  }

  // school lesson plan by status 
  async schoolLessonPlanByStatus(
    schoolId: string,
    status: LessonPlanType,
    page: number = 1,
    filters: {
      termId?: string;
      sessionId?: string; 
      classId?: string;
      subjectId?: string;
    } = {},
  ) {
    try {
      // Validate school existence
      const school = await this.prisma.school.findUnique({
        where: { id: schoolId },
      });
      if (!school) {
        throw new UnauthorizedException('Unauthorized request: School not found');
      }

      // Validate status
      if (!Object.values(LessonPlanType).includes(status)) {
        throw new NotFoundException('Invalid status provided');
      }

      // Pagination settings
      const pageSize = 10; // Adjust as needed
      const skip = (page - 1) * pageSize;

      // Build where clause
      const where: Prisma.LessonPlanWhereInput = {
        schoolId,
        status,
        isDeleted: false,
        ...(filters.termId && { termId: filters.termId }),
        ...(filters.sessionId && { sessionId: filters.sessionId }),
        ...(filters.classId && { classId: filters.classId }),
        ...(filters.subjectId && { subjectId: filters.subjectId }),
      };

      // Fetch lesson plans with related data
      const [lessonPlans, total] = await Promise.all([
        this.prisma.lessonPlan.findMany({
          where,
          include: {
            subject: {
              select: {
                id: true,
                name: true,
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
            term: {
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
          },
          skip,
          take: pageSize,
          orderBy: {
            createdAt: 'desc',
          },
        }),
        this.prisma.lessonPlan.count({ where }),
      ]);

      if (!lessonPlans || lessonPlans.length === 0) {
        throw new NotFoundException('No lesson plans found for the specified criteria');
      }

      return {
        data: lessonPlans,
        meta: {
          total,
          page,
          pageSize,
          totalPages: Math.ceil(total / pageSize),
        },
      };
    } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError) {
        throw new InternalServerErrorException('Database error occurred');
      }
      throw error;
    }
  }

  async fetchSessionTermWeeks(schoolId, sessionId, termId){
    try {
      const school = await this.prisma.school.findUnique({where: {id: schoolId}})
      if(!school)  throw new UnauthorizedException("Unauthorized request!")
        const termWeeks = await this.prisma.weeks.findMany({where: {sessionId, termId}})
      if(termWeeks.length === 0){
        return []
      }
      return termWeeks
    } catch (error) {
      throw new InternalServerErrorException(`Something went wrong ${error.message}`)
    }
  } 
}