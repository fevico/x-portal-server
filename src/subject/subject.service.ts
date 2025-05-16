import { PrismaService } from '@/prisma/prisma.service';
import { HttpException, HttpStatus, Injectable } from '@nestjs/common';

@Injectable()
export class SubjectService {
    constructor(private prisma: PrismaService,
    ) {}
    async create(createSubjectDto: { name: string }, user: { id: string; schoolId: string }) {
        if (!createSubjectDto.name) {
          throw new HttpException('Subject name is required', HttpStatus.BAD_REQUEST);
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
          throw new HttpException('Subject name already exists in this school', HttpStatus.CONFLICT);
        }
    
        const subject = await this.prisma.subject.create({
          data: {
            name: createSubjectDto.name,
            schoolId: user.schoolId,
            createdBy: user.id,
          },
        });
    
        // Log action
         
        return subject;
      }
    
      async findAll(schoolId: string) {
        return this.prisma.subject.findMany({
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
        const subject = await this.prisma.subject.findFirst({
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
    
        if (!subject) {
          throw new HttpException('Subject not found', HttpStatus.NOT_FOUND);
        }
    
        return subject;
      }
    
      async update(id: string, updateSubjectDto: { name?: string }, user: { id: string; schoolId: string }) {
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
            throw new HttpException('Subject name already exists in this school', HttpStatus.CONFLICT);
          }
        }
    
        const updatedSubject = await this.prisma.subject.update({
          where: { id },
          data: {
            name: updateSubjectDto.name ?? subject.name,
            updatedBy: user.id,
            updatedAt: new Date(),
          },
        });
    
       
        return updatedSubject;
      }
    
      async delete(id: string, user: { id: string; schoolId: string }) {
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
    
        const deletedSubject = await this.prisma.subject.update({
          where: { id },
          data: {
            isDeleted: true,
            updatedBy: user.id,
            updatedAt: new Date(),
          },
        });

    
        return { message: 'Subject deleted successfully' };
      }
}
