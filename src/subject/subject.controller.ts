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
  @Delete('/subject/:id')
  async delete(@Param('id') id: string, @Request() req) {
    return this.subjectsService.delete(id, req);
  }
}
