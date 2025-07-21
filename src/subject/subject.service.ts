import { PrismaService } from '@/prisma/prisma.service';
import { AuthenticatedUser } from '@/types/express';
import { HttpException, HttpStatus, Injectable } from '@nestjs/common';
import { AssignSubjectToClassesDto } from './dto/assign-subject.dto';

@Injectable()
export class SubjectService {
  constructor(private prisma: PrismaService) {}

  /**
   * Assign a staff to teach subjects in multiple class arms and classes.
   * dto: { staffId, assignments: [ { subjectId, classId, classArmIds: [] } ] }
   * On each call, clear all current assignments for the staff, then create new ones from the payload.
   * If a subject/class/classArm is already assigned to another staff, skip and return error for that assignment.
   */
  async assignTeacherToSubjects(
    dto: {
      staffId: string;
      assignments: Array<{
        subjectId: string;
        classId: string;
        classArmIds: string[];
      }>;
    },
    req: any,
  ) {
    const user = req.user as AuthenticatedUser;
    const { staffId, assignments } = dto;
    if (!staffId || !Array.isArray(assignments) || assignments.length === 0) {
      throw new HttpException(
        'staffId and assignments are required',
        HttpStatus.BAD_REQUEST,
      );
    }

    // Validate staff exists
    const staff = await this.prisma.staff.findUnique({
      where: { id: staffId },
    });
    if (!staff)
      throw new HttpException('Staff not found', HttpStatus.NOT_FOUND);

    // Validate all subjects, classes, and classArms exist
    for (const assign of assignments) {
      const subject = await this.prisma.subject.findUnique({
        where: { id: assign.subjectId },
      });
      if (!subject)
        throw new HttpException(
          `Subject not found: ${assign.subjectId}`,
          HttpStatus.NOT_FOUND,
        );
      const classObj = await this.prisma.class.findUnique({
        where: { id: assign.classId },
      });
      if (!classObj)
        throw new HttpException(
          `Class not found: ${assign.classId}`,
          HttpStatus.NOT_FOUND,
        );
      for (const classArmId of assign.classArmIds) {
        const classArm = await this.prisma.classArm.findUnique({
          where: { id: classArmId },
        });
        if (!classArm)
          throw new HttpException(
            `Class arm not found: ${classArmId}`,
            HttpStatus.NOT_FOUND,
          );
      }
    }

    // Remove all current teacher assignments for this staff in this school
    await this.prisma.teacherSubjectAssignment.deleteMany({
      where: {
        staffId,
        schoolId: user.schoolId,
        isDeleted: false,
      },
    });

    let created = 0;
    const errors: string[] = [];
    for (const assign of assignments) {
      for (const classArmId of assign.classArmIds) {
        // Check if this subject/class/classArm is already assigned to another staff
        const existing = await this.prisma.teacherSubjectAssignment.findFirst({
          where: {
            subjectId: assign.subjectId,
            classId: assign.classId,
            classArmId: classArmId,
            schoolId: user.schoolId,
            isDeleted: false,
            NOT: { staffId },
          },
        });
        if (existing) {
          errors.push(
            `Subject ${assign.subjectId} in class ${assign.classId} arm ${classArmId} already assigned to another staff.`,
          );
          continue;
        }
        // Find the ClassArmSubjectAssignment record
        const classArmSubject =
          await this.prisma.classArmSubjectAssignment.findFirst({
            where: {
              subjectId: assign.subjectId,
              classId: assign.classId,
              classArmId: classArmId,
              schoolId: user.schoolId,
              isActive: true,
            },
          });
        if (!classArmSubject) {
          errors.push(
            `No ClassArmSubjectAssignment found for subject ${assign.subjectId}, class ${assign.classId}, arm ${classArmId}`,
          );
          continue;
        }
        // Assign teacher to subject/class/classArm, link to classArmSubjectId
        await this.prisma.teacherSubjectAssignment.create({
          data: {
            staffId,
            subjectId: assign.subjectId,
            classId: assign.classId,
            classArmId,
            classArmSubjectId: classArmSubject.id,
            schoolId: user.schoolId,
            createdBy: user.id,
          },
        });
        created++;
      }
    }
    if (errors.length > 0) {
      if (created === 0) {
        throw new HttpException(
          {
            message:
              'No assignments created. All assignments failed because subject/class/classArm already assigned to another staff.',
            errors,
          },
          HttpStatus.BAD_REQUEST,
        );
      } else {
        return {
          message: `Assignments: ${created} created. Some assignments failed:`,
          errors,
        };
      }
    }
    return {
      message: `Assignments: ${created} created successfully.`,
    };
  }
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

  async getSubjectsByClassArm(
    req: any,
    classId?: string,
    classArmId?: string,
    q?: string,
    page?: number,
    limit?: number,
  ) {
    const user = req.user as AuthenticatedUser;
    const where: any = {
      schoolId: user.schoolId,
      isActive: true,
    };
    if (classId) where.classId = classId;
    if (classArmId) where.classArmId = classArmId;
    if (q) {
      where.OR = [
        { subject: { name: { contains: q } } },
        { subject: { code: { contains: q } } },
      ];
    }

    let subjectAssignments: any[] = [];
    let total = 0;
    const usePagination = page !== undefined && limit !== undefined;
    let skip = 0;
    let take = 0;
    if (usePagination) {
      skip = (Number(page) - 1) * Number(limit);
      take = Number(limit);
    }

    // Fetch assignments
    const findManyArgs: any = {
      where,
      include: {
        subject: { select: { id: true, name: true, code: true } },
        class: { select: { id: true, name: true } },
        classArm: { select: { id: true, name: true } },
        teacherAssignments: {
          where: { isDeleted: false },
          include: {
            staff: {
              select: {
                id: true,
                user: { select: { firstname: true, lastname: true } },
              },
            },
          },
        },
      },
      orderBy: [
        { subject: { name: 'asc' } },
        { class: { name: 'asc' } },
        { classArm: { name: 'asc' } },
      ],
    };
    if (usePagination) {
      findManyArgs.skip = skip;
      findManyArgs.take = take;
    }

    if (classId && classArmId) {
      [subjectAssignments, total] = await Promise.all([
        this.prisma.classArmSubjectAssignment.findMany(findManyArgs),
        this.prisma.classArmSubjectAssignment.count({ where }),
      ]);
    } else if (classId) {
      [subjectAssignments, total] = await Promise.all([
        this.prisma.classArmSubjectAssignment.findMany(findManyArgs),
        this.prisma.classArmSubjectAssignment.count({ where }),
      ]);
    } else {
      subjectAssignments =
        await this.prisma.classArmSubjectAssignment.findMany(findManyArgs);
      total = subjectAssignments.length;
    }

    // Group by subject, then by class, then arms
    const subjectMap = new Map();
    for (const a of subjectAssignments) {
      if (!subjectMap.has(a.subject.id)) {
        subjectMap.set(a.subject.id, {
          id: a.subject.id,
          name: a.subject.name,
          code: a.subject.code,
          createdAt: a.subject.createdAt,
          updatedAt: a.subject.updatedAt,
          createdBy: a.subject.createdBy,
          assignments: [],
        });
      }
      const subj = subjectMap.get(a.subject.id);
      let classObj = subj.assignments.find((c) => c.classId === a.class.id);
      if (!classObj) {
        classObj = {
          classId: a.class.id,
          className: a.class.name,
          classArms: [],
        };
        subj.assignments.push(classObj);
      }
      // Avoid duplicate arms
      if (!classObj.classArms.some((arm) => arm.id === a.classArm.id)) {
        // Get first teacher assignment (if any)
        let teacher = null;
        if (a.teacherAssignments && a.teacherAssignments.length > 0) {
          const ta = a.teacherAssignments[0];
          if (ta.staff) {
            teacher = {
              staffId: ta.staff.id,
              staffName: ta.staff.user
                ? `${ta.staff.user.firstname} ${ta.staff.user.lastname}`.trim()
                : null,
            };
          }
        }
        classObj.classArms.push({
          id: a.classArm.id,
          name: a.classArm.name,
          teacher,
        });
      }
    }

    const result = Array.from(subjectMap.values());

    return {
      statusCode: 200,
      message: 'Subjects retrieved successfully',
      data: {
        total,
        subjects: result,
        pagination: usePagination
          ? {
              page: Number(page),
              limit: Number(limit),
              total,
              totalPages: Math.ceil(total / Number(limit)),
            }
          : undefined,
      },
    };
  }
}
