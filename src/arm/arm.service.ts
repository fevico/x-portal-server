import { PrismaService } from '@/prisma/prisma.service';
import { HttpException, HttpStatus, Injectable } from '@nestjs/common';

@Injectable()
export class ClassArmsService {

    constructor(
        private prisma: PrismaService,
      ) {}
    async create(createClassArmDto: { name: string }, user: { id: string; schoolId: string }) {
        if (!createClassArmDto.name) {
          throw new HttpException('Class arm name is required', HttpStatus.BAD_REQUEST);
        }
    
        // Check for existing class arm
        const existing = await this.prisma.classArm.findFirst({
          where: {
            name: createClassArmDto.name,
            schoolId: user.schoolId,
            isDeleted: false,
          },
        });
    
        if (existing) {
          throw new HttpException('Class arm name already exists in this school', HttpStatus.CONFLICT);
        }
    
        const classArm = await this.prisma.classArm.create({
          data: {
            name: createClassArmDto.name,
            schoolId: user.schoolId,
            createdBy: user.id,
          },
        });
    
        // Log action
    
    
        return classArm;
      }
    
      async findAll(schoolId: string) {
        return this.prisma.classArm.findMany({
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
        const classArm = await this.prisma.classArm.findFirst({
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
    
        if (!classArm) {
          throw new HttpException('Class arm not found', HttpStatus.NOT_FOUND);
        }
    
        return classArm;
      }
    
      async update(id: string, updateClassArmDto: { name?: string }, user: { id: string; schoolId: string }) {
        const classArm = await this.prisma.classArm.findFirst({
          where: {
            id,
            schoolId: user.schoolId,
            isDeleted: false,
          },
        });
    
        if (!classArm) {
          throw new HttpException('Class arm not found', HttpStatus.NOT_FOUND);
        }
    
        if (updateClassArmDto.name) {
          // Check for name conflict
          const existing = await this.prisma.classArm.findFirst({
            where: {
              name: updateClassArmDto.name,
              schoolId: user.schoolId,
              isDeleted: false,
              id: { not: id },
            },
          });
    
          if (existing) {
            throw new HttpException('Class arm name already exists in this school', HttpStatus.CONFLICT);
          }
        }
    
        const updatedClassArm = await this.prisma.classArm.update({
          where: { id },
          data: {
            name: updateClassArmDto.name ?? classArm.name,
            updatedBy: user.id,
            updatedAt: new Date(),
          },
        });
    
    
        return updatedClassArm;
      }
    
      async delete(id: string, user: { id: string; schoolId: string }) {
        const classArm = await this.prisma.classArm.findFirst({
          where: {
            id,
            schoolId: user.schoolId,
            isDeleted: false,
          },
        });
    
        if (!classArm) {
          throw new HttpException('Class arm not found', HttpStatus.NOT_FOUND);
        }
    
        const deletedClassArm = await this.prisma.classArm.update({
          where: { id },
          data: {
            isDeleted: true,
            updatedBy: user.id,
            updatedAt: new Date(),
          },
        });
    
   
        return { message: 'Class arm deleted successfully' };
      }
}
