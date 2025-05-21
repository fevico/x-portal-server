import { PrismaService } from '@/prisma/prisma.service';
import { HttpException, HttpStatus, Injectable } from '@nestjs/common';
import { AssignClassArmsDto } from './dto/assign.class.dto';
import { AuthenticatedUser } from '@/types/express';

@Injectable()
export class ClassesService {
  constructor(private prisma: PrismaService) {}

    
      async create(createClassDto: { name: string }, user: { id: string; schoolId: string }) {
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
          throw new HttpException('Class name already exists in this school', HttpStatus.CONFLICT);
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
    
      async update(id: string, updateClassDto: { name?: string }, user: AuthenticatedUser) {
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
            throw new HttpException('Class name already exists in this school', HttpStatus.CONFLICT);
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

      async assignClassArms(
        assignClassArmsDto: AssignClassArmsDto,
        user: AuthenticatedUser
      ) {
        const { classId, classArmIds } = assignClassArmsDto;
    
        // Validate classId
        const classRecord = await this.prisma.class.findFirst({
          where: {
            id: classId,
            schoolId: user.schoolId,
            isDeleted: false,
          },
        });
        if (!classRecord) {
          throw new HttpException('Class not found', HttpStatus.NOT_FOUND);
        }
    
        // Validate classArmIds
        const validClassArms = await this.prisma.classArm.findMany({
          where: {
            id: { in: classArmIds },
            schoolId: user.schoolId,
            isDeleted: false,
          },
        });
        if (validClassArms.length !== classArmIds.length) {
          throw new HttpException(
            'One or more class arm IDs are invalid or do not belong to this school',
            HttpStatus.BAD_REQUEST,
          );
        }
    
        // Check for existing assignments
        const existingAssignments = await this.prisma.classClassArm.findMany({
          where: {
            classId,
            classArmId: { in: classArmIds },
            schoolId: user.schoolId,
            isDeleted: false,
          },
        });
        if (existingAssignments.length > 0) {
          const existingArmIds = existingAssignments.map((a) => a.classArmId);
          throw new HttpException(
            `Class arms already assigned: ${existingArmIds.join(', ')}`,
            HttpStatus.CONFLICT,
          );
        }
    
        // Create ClassClassArm records
        const classClassArmsData = classArmIds.map((classArmId) => ({
          // id: uuidv4(),
          classId,
          classArmId,
          schoolId: user.schoolId,
          createdBy: user.id,
        }));
    
        await this.prisma.classClassArm.createMany({
          data: classClassArmsData,
        });
    
        // Fetch created records for response
        const createdAssignments = await this.prisma.classClassArm.findMany({
          where: {
            classId,
            classArmId: { in: classArmIds },
            schoolId: user.schoolId,
            isDeleted: false,
          },
          include: {
            class: { select: { name: true } },
            classArm: { select: { name: true } },
          },
        });
    
   
        return createdAssignments;
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
