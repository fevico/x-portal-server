import {
  Injectable,
  ConflictException,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateSchoolDto } from './dto/create-school.dto';
import { UpdateSchoolDto } from './dto/update-school.dto';

@Injectable()
export class SchoolsService {
  constructor(private prisma: PrismaService) {}

  async create(createSchoolDto: CreateSchoolDto) {
    const existing = await this.prisma.school.findUnique({
      where: { name: createSchoolDto.name },
    });
    if (existing) throw new ConflictException('School name already exists');
    return this.prisma.school.create({ data: createSchoolDto });
  }

  async findAll() {
    return this.prisma.school.findMany();
  }

  async findOne(id: string) {
    const school = await this.prisma.school.findUnique({
      where: { id },
      include: {
        users: { select: { id: true, firstname: true, lastname: true } },
        subRoles: {
          include: { permissions: { include: { permission: true } } },
        },
      },
    });
    if (!school) throw new NotFoundException('School not found');
    return school;
  }

  async update(id: string, updateSchoolDto: UpdateSchoolDto) {
    const school = await this.prisma.school.findUnique({ where: { id } });
    if (!school) throw new NotFoundException('School not found');
    if (updateSchoolDto.name) {
      const existing = await this.prisma.school.findUnique({
        where: { name: updateSchoolDto.name },
      });
      if (existing && existing.id !== id) {
        throw new ConflictException('School name already exists');
      }
    }
    return this.prisma.school.update({
      where: { id },
      data: updateSchoolDto,
    });
  }

  async remove(id: string) {
    const school = await this.prisma.school.findUnique({ where: { id } });
    if (!school) throw new NotFoundException('School not found');
    return this.prisma.school.delete({ where: { id } });
  }
}
