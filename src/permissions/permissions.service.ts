import {
  Injectable,
  ConflictException,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreatePermissionDto } from './dto/create-permission.dto';
import { UpdatePermissionDto } from './dto/update-permission.dto';

@Injectable()
export class PermissionsService {
  constructor(private prisma: PrismaService) {}

  async create(createPermissionDto: CreatePermissionDto) {
    const existing = await this.prisma.permission.findUnique({
      where: { name: createPermissionDto.name },
    });
    if (existing) throw new ConflictException('Permission name already exists');
    return this.prisma.permission.create({ data: createPermissionDto });
  }

  async findAll() {
    return this.prisma.permission.findMany();
  }

  async findOne(id: string) {
    const permission = await this.prisma.permission.findUnique({
      where: { id },
    });
    if (!permission) throw new NotFoundException('Permission not found');
    return permission;
  }

  async update(id: string, updatePermissionDto: UpdatePermissionDto) {
    const permission = await this.prisma.permission.findUnique({
      where: { id },
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
    return this.prisma.permission.update({
      where: { id },
      data: updatePermissionDto,
    });
  }

  async remove(id: string) {
    const permission = await this.prisma.permission.findUnique({
      where: { id },
    });
    if (!permission) throw new NotFoundException('Permission not found');
    return this.prisma.permission.delete({ where: { id } });
  }
}
