import { PrismaService } from '@/prisma/prisma.service';
import {
  BadRequestException,
  HttpException,
  HttpStatus,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { AuthenticatedUser } from '@/types/express';
import { LoggingService } from '@/log/logging.service';

@Injectable()
export class ClassesService {
  constructor(
    private prisma: PrismaService,
    private loggingService: LoggingService,
  ) {}

  async create(createClassDto: { name: string; category: string }, req) {
    const user = req.user as AuthenticatedUser;
    if (!createClassDto.name) {
      throw new HttpException('Class name is required', HttpStatus.BAD_REQUEST);
    }

    if (!createClassDto.category) {
      throw new HttpException(
        'Class category is required',
        HttpStatus.BAD_REQUEST,
      );
    }

    // Check for existing class
    const existing = await this.prisma.class.findFirst({
      where: {
        name: createClassDto.name,
        schoolId: user.schoolId,
        isDeleted: false,
      },
    });

    if (existing) {
      throw new HttpException(
        'Class name already exists in this school',
        HttpStatus.CONFLICT,
      );
    }

    // Check if the category exists
    const categoryExists = await this.prisma.classCategory.findFirst({
      where: {
        id: createClassDto.category,
        schoolId: user.schoolId,
        isDeleted: false,
      },
    });
    if (!categoryExists) {
      throw new HttpException(
        'Class category does not exist in this school',
        HttpStatus.NOT_FOUND,
      );
    }

    const classRecord = await this.prisma.class.create({
      data: {
        name: createClassDto.name.toLowerCase(),
        schoolId: user.schoolId,
        classCategoryId: createClassDto.category,
        createdBy: user.id,
      },
    });

    await this.loggingService.logAction(
      'create_class',
      'Class',
      classRecord.id,
      user.id,
      user.schoolId,
      { name: classRecord.name },
      req,
    );

    return classRecord;
  }

  // class: { select: { id: true, name: true, category: true } },
  // +              class: {
  // +                select: {
  // +                  id: true,
  // +                  name: true,
  // +                },
  // +                include: {
  // +                  classCategory: { select: { name: true } },
  // +                },
  // +              },

  async findAll(req) {
    try {
      return await this.prisma.class.findMany({
        where: {
          schoolId: req.user.schoolId,
          isDeleted: false,
        },
        orderBy: { name: 'asc' },
        select: {
          id: true,
          name: true,
          classCategory: {
            select: {
              id: true,
              name: true,
            },
          },
          isActive: true,
        },
      });
    } catch (error) {
      throw new HttpException(
        'Failed to fetch classes',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  async findOne(id: string, schoolId: string) {
    const classRecord = await this.prisma.class.findFirst({
      where: {
        id,
        schoolId,
        isDeleted: false,
      },
      select: {
        id: true,
        name: true,
        createdAt: true,
        updatedAt: true,
        createdBy: true,
      },
    });

    if (!classRecord) {
      throw new HttpException('Class not found', HttpStatus.NOT_FOUND);
    }

    return classRecord;
  }

  async update(
    id: string,
    updateClassDto: { name?: string; category?: string; isActive?: boolean },
    user: AuthenticatedUser,
  ) {
    console.log('Update Class DTO:', updateClassDto, id);
    const classRecord = await this.prisma.class.findFirst({
      where: {
        id,
        schoolId: user.schoolId,
        isDeleted: false,
      },
    });

    if (!classRecord) {
      throw new HttpException('Class not found', HttpStatus.NOT_FOUND);
    }

    if (updateClassDto.name) {
      // Check for name conflict
      const existing = await this.prisma.class.findFirst({
        where: {
          name: updateClassDto.name.toLowerCase(),
          schoolId: user.schoolId,
          isDeleted: false,
          id: { not: id },
        },
      });

      if (existing) {
        throw new HttpException(
          'Class name already exists in this school',
          HttpStatus.CONFLICT,
        );
      }
    }

    const updatedClass = await this.prisma.class.update({
      where: { id },
      data: {
        name: updateClassDto.name ?? classRecord.name,
        classCategoryId: updateClassDto.category ?? classRecord.classCategoryId,
        updatedBy: user.id,
        isActive: updateClassDto.isActive,
        updatedAt: new Date(),
      },
    });

    return updatedClass;
  }

  async delete(id: string, user: { id: string; schoolId: string }) {
    const classRecord = await this.prisma.class.findFirst({
      where: {
        id,
        schoolId: user.schoolId,
        isDeleted: false,
      },
    });

    if (!classRecord) {
      throw new HttpException('Class not found', HttpStatus.NOT_FOUND);
    }

    await this.prisma.class.update({
      where: { id },
      data: {
        isDeleted: true,
        updatedBy: user.id,
        updatedAt: new Date(),
      },
    });

    return { message: 'Class deleted successfully' };
  }

  async assignArms(
    payload: {
      classId: string;
      sessionId: string;
      arms: string[];
    }[],
    req: any,
  ) {
    const requester = req.user;
    const schoolId = requester.schoolId;

    console.log('Payload:', payload);
    console.log('Requester:', requester);

    // Validate session and school
    const session = await this.prisma.session.findFirst({
      where: {
        id: payload[0]?.sessionId,
        schoolId,
        isDeleted: false,
      },
    });
    if (!session) {
      throw new NotFoundException('Session not found for this school');
    }

    // Pre-fetch all ClassArms to avoid repeated findFirst calls
    const allClassArms = await this.prisma.classArm.findMany({
      where: {
        schoolId,
        isDeleted: false,
      },
      select: {
        id: true,
        name: true,
      },
    });

    return this.prisma.$transaction(
      async (tx) => {
        try {
          for (const item of payload) {
            // Validate class exists
            const classExists = await tx.class.findFirst({
              where: { id: item.classId, schoolId, isDeleted: false },
            });
            if (!classExists) {
              throw new NotFoundException(
                `Class with ID ${item.classId} not found`,
              );
            }

            // Delete existing assignments for this class and session
            await tx.sessionClassAssignment.deleteMany({
              where: {
                sessionId: item.sessionId,
                classId: item.classId,
                schoolId,
              },
            });

            // Map arm names to ClassArm IDs using pre-fetched data
            const armData = item.arms.map((armName) => {
              const classArm = allClassArms.find((ca) => ca.name === armName);
              if (!classArm) {
                throw new NotFoundException(
                  `ClassArm with name ${armName} not found`,
                );
              }
              return {
                sessionId: item.sessionId,
                classId: item.classId,
                classArmId: classArm.id,
                schoolId,
                // createdAt: new Date(), // Current date: 04:03 AM WAT, May 24, 2025
                // updatedAt: new Date(),
                createdBy: requester.id,
                updatedBy: requester.id,
              };
            });

            // Create new assignments (skip if arms is empty)
            if (armData.length > 0) {
              await tx.sessionClassAssignment.createMany({
                data: armData,
              });
            }

            // Log the action
            await this.loggingService.logAction(
              'assign_arms',
              'SessionClassClassArm',
              item.classId,
              requester.id,
              requester.schoolId,
              {
                sessionId: item.sessionId,
                classId: item.classId,
                arms: item.arms,
              },
              req,
            );
          }

          return { message: 'Arms assigned successfully' };
        } catch (error) {
          console.error('Error assigning arms:', error);
          throw new BadRequestException(
            `Failed to assign arms: ${error.message || 'Unknown error'}`,
          );
        }
      },
      {
        timeout: 10000, // Increase timeout to 10 seconds
      },
    );
  }

  // async findAllClassArm(user: { schoolId: string }, classId?: string) {
  //   return this.prisma.classClassArm.findMany({
  //     where: {
  //       schoolId: user.schoolId,
  //       isDeleted: false,
  //       ...(classId && { classId }),
  //     },
  //     include: {
  //       class: { select: { name: true } },
  //       classArm: { select: { name: true } },
  //     },
  //   });
  // }

  async createClassCategory(body: any, user: AuthenticatedUser) {
    const { name } = body;
    const schoolId = user.schoolId;

    try {
      const existingCategory = await this.prisma.classCategory.findFirst({
        where: {
          name,
          isDeleted: false,
          schoolId, // Ensure the category is unique per school
        },
        include: { classes: true },
      });

      if (existingCategory) {
        throw new BadRequestException('Class category already exists');
      }

      const classCategory = await this.prisma.classCategory.create({
        data: {
          name: body.name,
          createdBy: user.id,
          school: { connect: { id: schoolId } },
        },
      });

      return classCategory;
    } catch (error) {
      throw new HttpException(
        'Failed to create class category',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  async getAllClassCategories(user: AuthenticatedUser) {
    const schoolId = user.schoolId;
    try {
      const classCategories = await this.prisma.classCategory.findMany({
        where: {
          schoolId,
          isDeleted: false,
        },
        orderBy: { name: 'asc' },
        include: { classes: true },
      });
      // console.log('Class Categories:', classCategories);
      return {
        classCategories,
        message: 'Class categories fetched successfully',
      };
    } catch (error) {
      throw new HttpException(
        'Failed to fetch class categories',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  async getClassCategoryById(id: string, user: AuthenticatedUser) {
    console.log(user);
    try {
      const classCategory = await this.prisma.classCategory.findUnique({
        where: { id },
        include: { classes: true },
      });

      if (!classCategory) {
        throw new NotFoundException('Class category not found');
      }

      return classCategory;
    } catch (error) {
      throw new HttpException(
        'Failed to fetch class category',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  async updateClassCategory(id: string, body: any, user: AuthenticatedUser) {
    const { name } = body;
    const schoolId = user.schoolId;
    try {
      const schoolCategory = await this.prisma.classCategory.findFirst({
        where: {
          id,
          schoolId,
          isDeleted: false,
        },
      });
      if (!schoolCategory) {
        throw new NotFoundException(
          `Class category not found for this school ${id}`,
        );
      }

      const updatedCategory = await this.prisma.classCategory.update({
        where: { id },
        data: {
          name,
          updatedBy: user.id,
        },
      });
      return updatedCategory;
    } catch (error) {
      throw new HttpException(
        'Failed to update class category',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  async deleteClassCategory(id: string, user: AuthenticatedUser) {
    const schoolId = user.schoolId;
    try {
      const classCategory = await this.prisma.classCategory.findFirst({
        where: {
          id,
          schoolId,
          isDeleted: false,
        },
      });

      if (!classCategory) {
        throw new NotFoundException('Class category not found');
      }

      await this.prisma.classCategory.update({
        where: { id },
        data: {
          isDeleted: true,
          updatedBy: user.id,
        },
      });

      return { message: 'Class category deleted successfully' };
    } catch (error) {
      throw new HttpException(
        'Failed to delete class category',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  async getClassesBySession(sessionId: string, user: AuthenticatedUser) {
    try {
      // Validate session exists and belongs to the school
      const session = await this.prisma.session.findFirst({
        where: {
          id: sessionId,
          schoolId: user.schoolId,
          isDeleted: false,
        },
        select: { id: true, name: true },
      });

      if (!session) {
        throw new NotFoundException('Session not found for this school');
      }

      // Get all class assignments for the session
      const classAssignments =
        await this.prisma.sessionClassAssignment.findMany({
          where: {
            sessionId,
            schoolId: user.schoolId,
            isDeleted: false,
          },
          include: {
            class: {
              select: {
                id: true,
                name: true,
                classCategory: {
                  select: { id: true, name: true },
                },
              },
            },
            classArm: {
              select: { id: true, name: true },
            },
          },
          orderBy: [{ class: { name: 'asc' } }, { classArm: { name: 'asc' } }],
        });

      // Group class arms by class
      const classesMap = new Map();

      classAssignments.forEach((assignment) => {
        const classId = assignment.class.id;

        if (!classesMap.has(classId)) {
          classesMap.set(classId, {
            id: assignment.class.id,
            name: assignment.class.name,
            category: assignment.class.classCategory,
            classArms: [],
          });
        }

        classesMap.get(classId).classArms.push({
          id: assignment.classArm.id,
          name: assignment.classArm.name,
        });
      });

      // Convert map to array and sort
      const classes = Array.from(classesMap.values()).sort((a, b) =>
        a.name.localeCompare(b.name),
      );

      return {
        statusCode: 200,
        message: 'Classes and arms retrieved successfully',
        data: {
          session: {
            id: session.id,
            name: session.name,
          },
          classes,
          totalClasses: classes.length,
          totalAssignments: classAssignments.length,
        },
      };
    } catch (error) {
      if (error instanceof NotFoundException) {
        throw error;
      }
      console.error('Error fetching classes by session:', error);
      throw new HttpException(
        'Failed to fetch classes and arms',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }
}
