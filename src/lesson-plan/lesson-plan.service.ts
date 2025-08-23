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


import { Injectable, BadRequestException, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateLessonPlan } from './dto/less-plan.dto';
import { AuthenticatedUser } from '@/types/express';

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
}