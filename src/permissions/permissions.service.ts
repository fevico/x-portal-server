import {
  Injectable,
  ConflictException,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { LoggingService } from '../log/logging.service'; // Adjust path
import { CreatePermissionDto } from './dto/create-permission.dto';
import { UpdatePermissionDto } from './dto/update-permission.dto';
import { AuthenticatedUser } from '@/types/express';

@Injectable()
export class PermissionsService {
  constructor(
    private prisma: PrismaService,
    private loggingService: LoggingService,
  ) {}

  async create(createPermissionDto: CreatePermissionDto, user: any) {
    try {
      const existing = await this.prisma.permission.findUnique({
        where: { name: createPermissionDto.name },
      });
      if (existing)
        throw new ConflictException('Permission name already exists');

      const permission = await this.prisma.permission.create({
        data: {
          ...createPermissionDto,
          createdBy: user.id,
        },
      });

      await this.loggingService.logAction(
        'create_permission',
        'Permission',
        permission.id,
        user.id,
        user.schoolId,
        { name: permission.name },
      );

      return permission;
    } catch (error) {
      throw error instanceof ConflictException
        ? error
        : new Error(`Failed to create permission: ${error.message}`);
    }
  }

  async findAll() {
    try {
      const permissions = await this.prisma.permission.findMany({
        where: { isDeleted: false },
      });

      // await this.loggingService.logAction(
      //   'read_permissions',
      //   'Permission',
      //   null,
      //   user.id,
      //   user.schoolId,
      //   { count: permissions.length },
      // );

      return permissions;
    } catch (error) {
      throw new Error(`Failed to fetch permissions: ${error.message}`);
    }
  }

  async findOne(id: string) {
    try {
      const permission = await this.prisma.permission.findUnique({
        where: { id, isDeleted: false },
      });
      if (!permission) throw new NotFoundException('Permission not found');

      // await this.loggingService.logAction(
      //   'read_permission',
      //   'Permission',
      //   id,
      //   user.id,
      //   user.schoolId,
      //   { name: permission.name },
      // );

      return permission;
    } catch (error) {
      throw error instanceof NotFoundException
        ? error
        : new Error(`Failed to fetch permission: ${error.message}`);
    }
  }

  async update(
    id: string,
    updatePermissionDto: UpdatePermissionDto,
    user: any,
  ) {
    try {
      const permission = await this.prisma.permission.findUnique({
        where: { id, isDeleted: false },
      });
      if (!permission) throw new NotFoundException('Permission not found');

      if (updatePermissionDto.name) {
        const existing = await this.prisma.permission.findUnique({
          where: { name: updatePermissionDto.name },
        });
        if (existing && existing.id !== id) {
          throw new ConflictException('Permission name already exists');
        }
      }

      const updatedPermission = await this.prisma.permission.update({
        where: { id },
        data: {
          ...updatePermissionDto,
          updatedBy: user.id,
        },
      });

      await this.loggingService.logAction(
        'update_permission',
        'Permission',
        id,
        user.id,
        user.schoolId,
        { changes: updatePermissionDto },
      );

      return updatedPermission;
    } catch (error) {
      throw error instanceof NotFoundException ||
        error instanceof ConflictException
        ? error
        : new Error(`Failed to update permission: ${error.message}`);
    }
  }

  async remove(id: string, user: any) {
    try {
      const permission = await this.prisma.permission.findUnique({
        where: { id, isDeleted: false },
      });
      if (!permission) throw new NotFoundException('Permission not found');

      const deletedPermission = await this.prisma.permission.update({
        where: { id },
        data: { isDeleted: true, updatedBy: user.id },
      });

      await this.loggingService.logAction(
        'delete_permission',
        'Permission',
        id,
        user.id,
        user.schoolId,
        { name: permission.name },
      );

      return deletedPermission;
    } catch (error) {
      throw error instanceof NotFoundException
        ? error
        : new Error(`Failed to delete permission: ${error.message}`);
    }
  }

  async findBySubRoleId(subRoleId: string, user: any) {
    try {
      const subRole = await this.prisma.subRole.findUnique({
        where: { id: subRoleId, isDeleted: false },
      });
      if (!subRole) throw new NotFoundException('SubRole not found');

      const permissions = await this.prisma.subRolePermission.findMany({
        where: { subRoleId, schoolId: user.schoolId },
        include: { permission: true },
      });

      // await this.loggingService.logAction(
      //   'read_subrole_permissions',
      //   'SubRolePermission',
      //   subRoleId,
      //   user.id,
      //   user.schoolId,
      //   { subRoleId, count: permissions.length },
      // );

      return permissions.map((sp) => sp.permission);
    } catch (error) {
      throw error instanceof NotFoundException
        ? error
        : new Error(`Failed to fetch subrole permissions: ${error.message}`);
    }
  }

  async findByScopeSchool() {
    try {
      const permissions = await this.prisma.permission.findMany({
        where: { scope: 'school', isDeleted: false },
        orderBy: { name: 'asc' },
      });

      // await this.loggingService.logAction(
      //   'read_school_permissions',
      //   'Permission',
      //   null,
      //   user.id,
      //   user.schoolId,
      //   { scope: 'school', count: permissions.length },
      // );

      return permissions;
    } catch (error) {
      throw new Error(
        `Failed to fetch school-scoped permissions: ${error.message}`,
      );
    }
  }

  async updateSubRolePermissions(
    subRoleId: string,
    permissionIds: string[],
    user: AuthenticatedUser,
  ) {
    try {
      // if (!Array.isArray(permissionIds) || permissionIds.length === 0) {
      //   throw new ConflictException('Permission IDs cannot be empty');
      // }
      const subRole = await this.prisma.subRole.findUnique({
        where: { id: subRoleId, isDeleted: false },
      });
      if (!subRole) throw new NotFoundException('SubRole not found');

      // Validate permissionIds
      const permissions = await this.prisma.permission.findMany({
        where: { id: { in: permissionIds }, isDeleted: false },
      });
      if (permissions.length !== permissionIds.length) {
        throw new NotFoundException('One or more permissions not found');
      }

      // Delete existing permissions for the subrole
      await this.prisma.subRolePermission.deleteMany({
        where: { subRoleId, schoolId: user.schoolId },
      });

      // Create new permissions
      const newPermissions = permissionIds.map((permissionId) => ({
        // id: require('crypto').randomUUID(),
        subRoleId,
        permissionId,
        schoolId: user.schoolId,
        createdBy: user.id,
      }));

      await this.prisma.subRolePermission.createMany({
        data: newPermissions,
      });

      await this.loggingService.logAction(
        'update_subrole_permissions',
        'SubRolePermission',
        subRoleId,
        user.id,
        user.schoolId,
        { subRoleId, permissionIds },
      );

      return { message: 'SubRole permissions updated successfully' };
    } catch (error) {
      throw error instanceof NotFoundException
        ? error
        : new Error(`Failed to update subrole permissions: ${error.message}`);
    }
  }
}
