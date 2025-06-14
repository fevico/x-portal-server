import { PrismaService } from '@/prisma/prisma.service';
import { AuthenticatedUser } from '@/types/express';
import { HttpException, HttpStatus, Injectable } from '@nestjs/common';
import { AssignSubjectToClassesDto } from './dto/assign-subject.dto';

@Injectable()
export class SubjectService {
  constructor(private prisma: PrismaService) {}
  async create(createSubjectDto: { name: string; code: string }, req) {
    const user = req.user as AuthenticatedUser;
    if (!createSubjectDto.name) {
      throw new HttpException(
        'Subject name is required',
        HttpStatus.BAD_REQUEST,
      );
    }

    // Check for existing subject
    const existing = await this.prisma.subject.findFirst({
      where: {
        name: createSubjectDto.name,
        schoolId: user.schoolId,
        isDeleted: false,
      },
    });

    if (existing) {
      throw new HttpException(
        'Subject name already exists in this school',
        HttpStatus.CONFLICT,
      );
    }

    const subject = await this.prisma.subject.create({
      data: {
        name: createSubjectDto.name,
        code: createSubjectDto.code,
        schoolId: user.schoolId,
        createdBy: user.id,
      },
    });

    // Log action

    return subject;
  }

  async findAll(req) {
    const user = req.user as AuthenticatedUser;
    const subjects = await this.prisma.subject.findMany({
      where: {
        schoolId: user.schoolId,
        isDeleted: false,
      },
      select: {
        id: true,
        name: true,
        code: true,
        createdAt: true,
        updatedAt: true,
        createdBy: true,
        classArmSubjects: {
          where: { isActive: true },
          include: {
            class: {
              select: { id: true, name: true },
            },
            classArm: {
              select: { id: true, name: true },
            },
          },
        },
      },
    });

    // Transform the data to group assignments by class
    return subjects.map((subject) => ({
      id: subject.id,
      name: subject.name,
      code: subject.code,
      createdAt: subject.createdAt,
      updatedAt: subject.updatedAt,
      createdBy: subject.createdBy,
      assignments: subject.classArmSubjects.reduce((acc, assignment) => {
        const classId = assignment.class.id;
        const existingClass = acc.find((c) => c.classId === classId);

        if (existingClass) {
          existingClass.classArms.push({
            id: assignment.classArm.id,
            name: assignment.classArm.name,
          });
        } else {
          acc.push({
            classId: assignment.class.id,
            className: assignment.class.name,
            classArms: [
              {
                id: assignment.classArm.id,
                name: assignment.classArm.name,
              },
            ],
          });
        }

        return acc;
      }, [] as any[]),
    }));
  }

  async findOne(id: string, req) {
    const user = req.user as AuthenticatedUser;
    const subject = await this.prisma.subject.findFirst({
      where: {
        id,
        schoolId: user.schoolId,
        isDeleted: false,
      },
      select: {
        id: true,
        name: true,
        code: true,
        createdAt: true,
        updatedAt: true,
        createdBy: true,
      },
    });

    if (!subject) {
      throw new HttpException('Subject not found', HttpStatus.NOT_FOUND);
    }

    return subject;
  }

  async update(
    id: string,
    updateSubjectDto: { name?: string; code?: string },
    req,
  ) {
    const user = req.user as AuthenticatedUser;
    const subject = await this.prisma.subject.findFirst({
      where: {
        id,
        schoolId: user.schoolId,
        isDeleted: false,
      },
    });

    if (!subject) {
      throw new HttpException('Subject not found', HttpStatus.NOT_FOUND);
    }

    if (updateSubjectDto.name) {
      // Check for name conflict
      const existing = await this.prisma.subject.findFirst({
        where: {
          name: updateSubjectDto.name,
          schoolId: user.schoolId,
          isDeleted: false,
          id: { not: id },
        },
      });

      if (existing) {
        throw new HttpException(
          'Subject name already exists in this school',
          HttpStatus.CONFLICT,
        );
      }
    }

    const updatedSubject = await this.prisma.subject.update({
      where: { id },
      data: {
        name: updateSubjectDto.name ?? subject.name,
        code: updateSubjectDto.code ?? subject.code,
        updatedBy: user.id,
        updatedAt: new Date(),
      },
    });

    return updatedSubject;
  }

  async delete(id: string, req) {
    const user = req.user as AuthenticatedUser;
    const subject = await this.prisma.subject.findFirst({
      where: {
        id,
        schoolId: user.schoolId,
        isDeleted: false,
      },
    });

    if (!subject) {
      throw new HttpException('Subject not found', HttpStatus.NOT_FOUND);
    }

    await this.prisma.subject.update({
      where: { id },
      data: {
        isDeleted: true,
        updatedBy: user.id,
        updatedAt: new Date(),
      },
    });

    return { message: 'Subject deleted successfully' };
  }

  async assignSubjectToClasses(
    subjectId: string,
    dto: AssignSubjectToClassesDto,
    req: any,
  ) {
    const user = req.user as AuthenticatedUser;

    try {
      // Validate subject exists and belongs to the school
      const subject = await this.prisma.subject.findFirst({
        where: {
          id: subjectId,
          schoolId: user.schoolId,
          isDeleted: false,
        },
        select: { id: true, name: true },
      });

      if (!subject) {
        throw new HttpException(
          'Subject not found or does not belong to your school',
          HttpStatus.NOT_FOUND,
        );
      }

      // Validate assignments
      if (!dto.assignments || dto.assignments.length === 0) {
        throw new HttpException(
          'At least one class assignment must be provided',
          HttpStatus.BAD_REQUEST,
        );
      }

      // Extract all unique class IDs and class arm IDs
      const classIds = [...new Set(dto.assignments.map((a) => a.classId))];
      const allClassArmIds = dto.assignments.flatMap((a) => a.classArmIds);
      const uniqueClassArmIds = [...new Set(allClassArmIds)];

      // Validate all classes belong to the school
      const classes = await this.prisma.class.findMany({
        where: {
          id: { in: classIds },
          schoolId: user.schoolId,
          isDeleted: false,
        },
        select: { id: true, name: true },
      });

      if (classes.length !== classIds.length) {
        throw new HttpException(
          'One or more classes not found or do not belong to your school',
          HttpStatus.BAD_REQUEST,
        );
      }

      // Validate all class arms belong to the school and their respective classes
      const classArms = await this.prisma.classArm.findMany({
        where: {
          id: { in: uniqueClassArmIds },
          schoolId: user.schoolId,
          isDeleted: false,
        },
        select: { id: true, name: true, schoolId: true },
      });

      if (classArms.length !== uniqueClassArmIds.length) {
        throw new HttpException(
          'One or more class arms not found or do not belong to your school',
          HttpStatus.BAD_REQUEST,
        );
      }

      // Validate that each class arm belongs to its specified class
      for (const assignment of dto.assignments) {
        const classArmsForClass = await this.prisma.classArm.findMany({
          where: {
            id: { in: assignment.classArmIds },
            schoolId: user.schoolId,
            isDeleted: false,
          },
          select: { id: true },
        });

        if (classArmsForClass.length !== assignment.classArmIds.length) {
          throw new HttpException(
            `Some class arms do not exist for class ID: ${assignment.classId}`,
            HttpStatus.BAD_REQUEST,
          );
        }
      }

      // Create assignments in a transaction
      const result = await this.prisma.$transaction(async (tx) => {
        // Delete existing assignments for this subject and the specified classes/arms
        await tx.classArmSubjectAssignment.deleteMany({
          where: {
            subjectId,
            schoolId: user.schoolId,
            OR: dto.assignments.map((assignment) => ({
              classId: assignment.classId,
              classArmId: { in: assignment.classArmIds },
            })),
          },
        });

        // Create new assignments
        const newAssignments = [];
        for (const assignment of dto.assignments) {
          for (const classArmId of assignment.classArmIds) {
            newAssignments.push({
              classId: assignment.classId,
              classArmId,
              subjectId,
              schoolId: user.schoolId,
              createdBy: user.id,
            });
          }
        }

        const createdAssignments =
          await tx.classArmSubjectAssignment.createMany({
            data: newAssignments,
          });

        return createdAssignments;
      });

      return {
        statusCode: 200,
        message: 'Subject assigned to classes successfully',
        data: {
          subjectId,
          subjectName: subject.name,
          assignments: dto.assignments.map((assignment) => ({
            classId: assignment.classId,
            classArmIds: assignment.classArmIds,
          })),
          totalAssignments: result.count,
        },
      };
    } catch (error) {
      if (error instanceof HttpException) {
        throw error;
      }
      console.error('Error assigning subject to classes:', error);
      throw new HttpException(
        'Failed to assign subject to classes: ' +
          (error.message || 'Unknown error'),
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }
}
