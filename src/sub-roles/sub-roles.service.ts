import {
  Injectable,
  NotFoundException,
  ForbiddenException,
  ConflictException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
// import { CreateSubRoleDto } from './dto/create-sub-role.dto';
// import { UpdateSubRoleDto } from './dto/update-sub-role.dto';
import { User } from '@prisma/client';
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
    if (!requester.permissions.includes('MANAGE_SUBROLES')) {
      throw new ForbiddenException('Requires MANAGE_SUBROLES permission');
    }
    if (
      requester.schoolId &&
      createSubRoleDto.schoolId !== requester.schoolId
    ) {
      throw new ForbiddenException(
        'Cannot create sub-role for a different school',
      );
    }

    const existing = await this.prisma.subRole.findUnique({
      where: {
        name_schoolId: {
          name: createSubRoleDto.name,
          schoolId: createSubRoleDto.schoolId,
        },
      },
    });
    if (existing)
      throw new ConflictException('SubRole name already exists in this school');

    const { permissionIds, ...subRoleData } = createSubRoleDto;
    return this.prisma.subRole.create({
      data: {
        ...subRoleData,
        permissions: {
          create: permissionIds.map((permissionId) => ({
            permissionId,
          })),
        },
      },
      include: { permissions: { include: { permission: true } } },
    });
  }

  async findAll(schoolId: string, requester: User) {
    if (requester.schoolId && schoolId !== requester.schoolId) {
      throw new ForbiddenException(
        'Cannot view sub-roles for a different school',
      );
    }
    return this.prisma.subRole.findMany({
      where: { schoolId },
      include: { permissions: { include: { permission: true } } },
    });
  }

  async findOne(id: string, requester: User) {
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
    if (!requester.permissions.includes('MANAGE_SUBROLES')) {
      throw new ForbiddenException('Requires MANAGE_SUBROLES permission');
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

    const { permissionIds, ...subRoleData } = updateSubRoleDto;
    return this.prisma.subRole.update({
      where: { id },
      data: {
        ...subRoleData,
        permissions: permissionIds
          ? {
              deleteMany: {},
              create: permissionIds.map((permissionId) => ({
                permissionId,
              })),
            }
          : undefined,
      },
      include: { permissions: { include: { permission: true } } },
    });
  }

  async remove(id: string, requester: AuthenticatedUser) {
    if (!requester.permissions.includes('MANAGE_SUBROLES')) {
      throw new ForbiddenException('Requires MANAGE_SUBROLES permission');
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
