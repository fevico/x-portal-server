
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

  // Service
async schoolLessonPlan(
  schoolId: string,
  filters: {
    subjectId?: string;
    termId?: string;
    sessionId?: string;
    classId?: string;
    status?: LessonPlanType;
    pageNum: number;
    limitNum: number;
    skip: number;
  },
) {
  try {
    // Validate school existence
    const school = await this.prisma.school.findUnique({
      where: { id: schoolId },
    });
    if (!school) {
      throw new UnauthorizedException('Unauthorized request: School not found');
    }

    // Build dynamic where clause
    const where: Prisma.LessonPlanWhereInput = {
      schoolId,
      isDeleted: false,
      isActive: true,
      ...(filters.subjectId && { subjectId: filters.subjectId }),
      ...(filters.termId && { termId: filters.termId }),
      ...(filters.sessionId && { sessionId: filters.sessionId }),
      ...(filters.classId && { classId: filters.classId }),
      ...(filters.status && { status: filters.status }),
    };

    // Get total count for pagination
    const totalCount = await this.prisma.lessonPlan.count({ where });

    // Fetch lesson plans
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
        createdAt: 'desc',
      },
      skip: filters.skip,
      take: filters.limitNum,
    });

    // Calculate pagination metadata
    const totalPages = Math.ceil(totalCount / filters.limitNum);
    const hasNextPage = filters.pageNum < totalPages;
    const hasPrevPage = filters.pageNum > 1;

    return {
      data: lessonPlans,
      pagination: {
        totalCount,
        currentPage: filters.pageNum,
        pageSize: filters.limitNum,
        totalPages,
        hasNextPage,
        hasPrevPage,
      },
    };
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError) {
      if (error.code === 'P2025') {
        throw new NotFoundException('No lesson plans found for the specified criteria');
      }
      throw new InternalServerErrorException('Database error occurred');
    }
    throw error;
  }
}

  // get school lession plan by id for tern in a session 
  async schoolLessonPlanById(
    schoolId: string,
    lessonPlanId: string,
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

  async updateLessonPlanStatus(schoolId: string, lesspnPlan: string, status: LessonPlanType){
    try {
      const lessonPlan = await this.prisma.lessonPlan.update({where: {id: lesspnPlan, schoolId}, data:{status}})
      if(!lessonPlan) throw new UnauthorizedException("Unauthorized request!")
        return {message: `Lesson plan status has been ${status}`}
    } catch (error) {
      throw new InternalServerErrorException(`Something went wrong ${error.message}`)
    }
  }
}