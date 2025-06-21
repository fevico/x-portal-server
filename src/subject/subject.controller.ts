import { JwtAuthGuard } from '@/auth/guards/jwt-auth.guards';
import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Param,
  Body,
  UseGuards,
  Request,
} from '@nestjs/common';
import { SubjectService } from './subject.service';
import { PermissionsGuard } from '@/auth/guards/permissions.guard';
import { Permissions } from '@/auth/decorators/permissions.decorator';
import { Request as RequestExpress } from 'express';
import { AssignSubjectToClassesDto } from './dto/assign-subject.dto';

@Controller('subject')
export class SubjectsController {
  constructor(private readonly subjectsService: SubjectService) {}

  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @Permissions('configuration:manage')
  @Post()
  async create(
    @Body() createSubjectDto: { name: string; code: string },
    @Request() req,
  ) {
    return this.subjectsService.create(createSubjectDto, req);
  }

  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @Permissions('configuration:read')
  @Get()
  async findAll(@Request() req) {
    return this.subjectsService.findAll(req);
  }

  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @Permissions('configuration:read')
  @Get(':id')
  async findOne(@Param('id') id: string, @Request() req) {
    return this.subjectsService.findOne(id, req);
  }

  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @Permissions('configuration:update')
  @Patch(':id')
  async update(
    @Param('id') id: string,
    @Body() updateSubjectDto: { name?: string; code?: string },
    @Request() req,
  ) {
    return this.subjectsService.update(id, updateSubjectDto, req);
  }

  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @Permissions('configuration:manage')
  @Delete('subject/:id')
  async delete(@Param('id') id: string, @Request() req) {
    return this.subjectsService.delete(id, req);
  }

  @Post('assign/:id')
  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @Permissions('configuration:manage')
  async assignSubjectToClasses(
    @Param('id') subjectId: string,
    @Body() dto: AssignSubjectToClassesDto,
    @Request() req: RequestExpress,
  ) {
    return this.subjectsService.assignSubjectToClasses(subjectId, dto, req);
  }

  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @Permissions('configuration:read')
  @Get('class/:classId/class-arm/:classArmId')
  async getSubjectsByClassArm(
    @Param('classId') classId: string,
    @Param('classArmId') classArmId: string,
    @Request() req: RequestExpress,
  ) {
    return this.subjectsService.getSubjectsByClassArm(classId, classArmId, req);
  }
}
