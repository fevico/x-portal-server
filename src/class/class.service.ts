import { PrismaService } from '@/prisma/prisma.service';
import { HttpException, HttpStatus, Injectable } from '@nestjs/common';

@Injectable()
export class ClassesService {
  constructor(private prisma: PrismaService) {}

  async create(
    createClassDto: { name: string },
    user: { id: string; schoolId: string },
  ) {
    if (!createClassDto.name) {
      throw new HttpException('Class name is required', HttpStatus.BAD_REQUEST);
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
        name: createClassDto.name,
        schoolId: user.schoolId,
        createdBy: user.id,
      },
    });

    return classRecord;
  }

  async findAll(schoolId: string) {
    return this.prisma.class.findMany({
      where: {
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
    updateClassDto: { name?: string },
    user: { id: string; schoolId: string },
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
          name: updateClassDto.name,
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

    const deletedClass = await this.prisma.class.update({
      where: { id },
      data: {
        isDeleted: true,
        updatedBy: user.id,
        updatedAt: new Date(),
      },
    });

    return { message: 'Class deleted successfully' };
  }
}
