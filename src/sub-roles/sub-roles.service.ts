import {
  Injectable,
  NotFoundException,
  ForbiddenException,
  ConflictException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
// import { CreateSubRoleDto } from './dto/create-sub-role.dto';
// import { UpdateSubRoleDto } from './dto/update-sub-role.dto';
import { Prisma, SubRole } from '@prisma/client';
import { CreateSubRoleDto } from './dto/create-sub-role.dto';
import { UpdateSubRoleDto } from './dto/update-sub-role.dto';
import { AuthenticatedUser } from '@/types/express';

@Injectable()
export class SubRolesService {
  constructor(private prisma: PrismaService) {}

  async create(
    createSubRoleDto: CreateSubRoleDto,
    requester: AuthenticatedUser,
  ) {
    if (
      requester.role !== 'superAdmin' &&
      !requester.permissions.includes('sub-role:create')
    ) {
      throw new ForbiddenException('Requires MANAGE SUBROLES permission');
    }

    const existing = await this.prisma.subRole.findUnique({
      where: {
        name_schoolId: {
          name: createSubRoleDto.name,
          schoolId: requester.schoolId,
        },
      },
    });
    if (existing)
      throw new ConflictException('SubRole name already exists in this school');

    // const { permissionIds, ...subRoleData } = createSubRoleDto;
    return this.prisma.subRole.create({
      data: {
        ...createSubRoleDto,
        schoolId: requester.schoolId,
      },
    });
  }

  async findAll(
    q: string,
    requester: AuthenticatedUser,
  ): Promise<{
    data: SubRole[];
    total: number;
  }> {
    const where: Prisma.SubRoleWhereInput = {
      OR: [{ schoolId: requester.schoolId }, { isGlobal: true }],
      ...(q
        ? {
            name: {
              contains: q,
            },
          }
        : {}),
    };

    const [data, total] = await Promise.all([
      this.prisma.subRole.findMany({
        where,
        include: { permissions: { include: { permission: true } } },
      }),
      this.prisma.subRole.count({ where }),
    ]);

    return { data, total };
  }

  async findOne(id: string, requester: AuthenticatedUser) {
    const subRole = await this.prisma.subRole.findUnique({
      where: { id },
      include: { permissions: { include: { permission: true } } },
    });
    if (!subRole) throw new NotFoundException('SubRole not found');
    if (requester.schoolId && subRole.schoolId !== requester.schoolId) {
      throw new ForbiddenException(
        'Cannot view sub-role for a different school',
      );
    }
    return subRole;
  }

  async update(
    id: string,
    updateSubRoleDto: UpdateSubRoleDto,
    requester: AuthenticatedUser,
  ) {
    if (!requester.permissions.includes('sub-role:update')) {
      throw new ForbiddenException('Requires MANAGE SUBROLES permission');
    }
    const subRole = await this.prisma.subRole.findUnique({ where: { id } });
    if (!subRole) throw new NotFoundException('SubRole not found');
    if (requester.schoolId && subRole.schoolId !== requester.schoolId) {
      throw new ForbiddenException(
        'Cannot modify sub-role for a different school',
      );
    }

    if (updateSubRoleDto.name) {
      const existing = await this.prisma.subRole.findUnique({
        where: {
          name_schoolId: {
            name: updateSubRoleDto.name,
            schoolId: subRole.schoolId,
          },
        },
      });
      if (existing && existing.id !== id) {
        throw new ConflictException(
          'SubRole name already exists in this school',
        );
      }
    }

    // Only allow updating name or description, not permissions
    const { name, description } = updateSubRoleDto;

    try {
      return await this.prisma.subRole.update({
        where: { id },
        data: {
          ...(name !== undefined ? { name } : {}),
          ...(description !== undefined ? { description } : {}),
        },
        include: { permissions: { include: { permission: true } } },
      });
    } catch (error) {
      throw new ConflictException(
        'Failed to update sub-role. Please ensure the name is unique and try again.',
      );
    }
  }

  async remove(id: string, requester: AuthenticatedUser) {
    if (!requester.permissions.includes('sub-role:delete')) {
      throw new ForbiddenException('Requires sub-role:delete permission');
    }
    const subRole = await this.prisma.subRole.findUnique({ where: { id } });
    if (!subRole) throw new NotFoundException('SubRole not found');
    if (requester.schoolId && subRole.schoolId !== requester.schoolId) {
      throw new ForbiddenException(
        'Cannot delete sub-role for a different school',
      );
    }
    return this.prisma.subRole.delete({ where: { id } });
  }
}
