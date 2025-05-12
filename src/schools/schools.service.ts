import {
  Injectable,
  ConflictException,
  NotFoundException,
  ForbiddenException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateSchoolDto } from './dto/create-school.dto';
import { UpdateSchoolDto } from './dto/update-school.dto';
import { School } from '@prisma/client';
import { AuthenticatedUser } from '@/types/express';

@Injectable()
export class SchoolsService {
  constructor(private prisma: PrismaService) {}

  async getSchools({
    search,
    page,
    limit,
  }: {
    search?: string;
    page: number;
    limit: number;
  }) {
    const where = search ? { name: { contains: search } } : {};

    const [schools, total] = await Promise.all([
      this.prisma.school.findMany({
        where,
        take: limit,
        skip: (page - 1) * limit,
        select: {
          id: true,
          name: true,
          email: true,
          contact: true,
          isActive: true,
          address: true,
          createdAt: true,
          updatedAt: true,
        },
      }),
      this.prisma.school.count({ where }),
    ]);

    return { schools, total };
  }

  async getSchoolById(id: string): Promise<School | null> {
    const school = await this.prisma.school.findUnique({
      where: { id },
      select: {
        id: true,
        name: true,
        email: true,
        contact: true,
        isActive: true,
        address: true,
        createdAt: true,
        updatedAt: true,
      },
    });
    return school;
  }

  async createSchool(
    dto: CreateSchoolDto,
    requester: AuthenticatedUser,
  ): Promise<School> {
    if (requester.role !== 'superAdmin') {
      throw new ForbiddenException('Only superAdmin can create schools');
    }
    try {
      return await this.prisma.school.create({
        data: {
          name: dto.name,
          email: dto.email,
          contact: dto.contact,
          address: dto.address,
        },
        select: {
          id: true,
          name: true,
          email: true,
          contact: true,
          isActive: true,
          address: true,
          createdAt: true,
          updatedAt: true,
        },
      });
    } catch (error) {
      if (error.code === 'P2002') {
        throw new ConflictException(
          'School name, email, or contact already exists',
        );
      }
      throw new ForbiddenException('Failed to create school');
    }
  }

  async updateSchool(
    id: string,
    dto: UpdateSchoolDto,
    requester: AuthenticatedUser,
  ): Promise<School | null> {
    if (requester.role !== 'superAdmin') {
      throw new ForbiddenException('Only superAdmin can update schools');
    }

    // Fetch the current school
    const currentSchool = await this.prisma.school.findUnique({
      where: { id },
      select: { id: true, name: true, email: true, contact: true },
    });

    if (!currentSchool) {
      return null; // Handled in controller
    }

    // Build update data, excluding unchanged unique fields
    const updateData: Partial<UpdateSchoolDto> = {};
    if (dto.name && dto.name !== currentSchool.name) {
      updateData.name = dto.name;
    }
    if (dto.email && dto.email !== currentSchool.email) {
      updateData.email = dto.email;
    }
    if (dto.contact && dto.contact !== currentSchool.contact) {
      updateData.contact = dto.contact;
    }
    if (dto.address !== undefined) {
      updateData.address = dto.address;
    }

    // Check for conflicts with other schools
    if (updateData.name || updateData.email || updateData.contact) {
      const conflicts = await this.prisma.school.findFirst({
        where: {
          id: { not: id }, // Exclude the current school
          OR: [
            updateData.name ? { name: updateData.name } : undefined,
            updateData.email ? { email: updateData.email } : undefined,
            updateData.contact ? { contact: updateData.contact } : undefined,
          ].filter(Boolean),
        },
        select: { id: true, name: true, email: true, contact: true },
      });

      if (conflicts) {
        const messages = [];
        if (updateData.name && conflicts.name === updateData.name) {
          messages.push(`Name "${updateData.name}" is already taken`);
        }
        if (updateData.email && conflicts.email === updateData.email) {
          messages.push(`Email "${updateData.email}" is already taken`);
        }
        if (updateData.contact && conflicts.contact === updateData.contact) {
          messages.push(`Contact "${updateData.contact}" is already taken`);
        }
        throw new ConflictException(messages.join(', '));
      }
    }

    // Perform update only if there are changes
    if (Object.keys(updateData).length === 0) {
      // No changes, return current school
      return this.prisma.school.findUnique({
        where: { id },
        select: {
          id: true,
          name: true,
          email: true,
          contact: true,
          isActive: true,
          address: true,
          createdAt: true,
          updatedAt: true,
        },
      });
    }

    try {
      return await this.prisma.school.update({
        where: { id },
        data: updateData,
        select: {
          id: true,
          name: true,
          email: true,
          contact: true,
          isActive: true,
          address: true,
          createdAt: true,
          updatedAt: true,
        },
      });
    } catch (error) {
      if (error.code === 'P2025') {
        return null; // Handled in controller
      }
      throw new ForbiddenException('Failed to update school');
    }
  }

  async deleteSchool(id: string, requester: AuthenticatedUser): Promise<void> {
    if (requester.role !== 'superAdmin') {
      throw new ForbiddenException('Only superAdmin can delete schools');
    }
    try {
      await this.prisma.school.delete({ where: { id } });
    } catch (error) {
      if (error.code === 'P2025') {
        throw new NotFoundException('School not found');
      }
      throw new ForbiddenException('Failed to delete school');
    }
  }

  async toggleSchoolActive(
    id: string,
    requester: AuthenticatedUser,
  ): Promise<School | null> {
    if (requester.role !== 'superAdmin') {
      throw new ForbiddenException(
        'Only superAdmin can toggle school active status',
      );
    }
    const school = await this.prisma.school.findUnique({ where: { id } });
    if (!school) {
      return null; // Handled in controller
    }
    try {
      return await this.prisma.school.update({
        where: { id },
        data: { isActive: !school.isActive },
        select: {
          id: true,
          name: true,
          email: true,
          contact: true,
          isActive: true,
          address: true,
          createdAt: true,
          updatedAt: true,
        },
      });
    } catch (error) {
      throw new ForbiddenException('Failed to toggle school active status');
    }
  }
}
