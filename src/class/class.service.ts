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
import { Category } from '@prisma/client';

@Injectable()
export class ClassesService {
  constructor(
    private prisma: PrismaService,
    private loggingService: LoggingService,
  ) {}

  async create(createClassDto: { name: string; category: Category }, req) {
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

    const classRecord = await this.prisma.class.create({
      data: {
        name: createClassDto.name.toLowerCase(),
        schoolId: user.schoolId,
        category: createClassDto.category,
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

  async findAll(req) {
    try {
      return await this.prisma.class.findMany({
        where: {
          schoolId: req.user.schoolId,
          isDeleted: false,
        },
        select: {
          id: true,
          name: true,
          category: true,
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
    updateClassDto: { name?: string; category?: Category },
    user: AuthenticatedUser,
  ) {
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
        category: updateClassDto.category ?? classRecord.category,
        updatedBy: user.id,
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
            await tx.sessionClassClassArm.deleteMany({
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
              await tx.sessionClassClassArm.createMany({
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

  async findAllClassArm(user: { schoolId: string }, classId?: string) {
    return this.prisma.classClassArm.findMany({
      where: {
        schoolId: user.schoolId,
        isDeleted: false,
        ...(classId && { classId }),
      },
      include: {
        class: { select: { name: true } },
        classArm: { select: { name: true } },
      },
    });
  }
}
