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
    const school = await this.prisma.school.create({ data: createSchoolDto });
    return { data: createSchoolDto, statusCode: 200, message: 'School created' };
  }

  async findAll() {
    const schools = await this.prisma.school.findMany();
    if(!schools) throw new NotFoundException('No schools found');
    return schools;
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
