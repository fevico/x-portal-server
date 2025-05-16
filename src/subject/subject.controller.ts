import { JwtAuthGuard } from '@/auth/guards/jwt-auth.guards';
import { Controller, Get, Post, Patch, Delete, Param, Body, UseGuards, Request } from '@nestjs/common';
import { SubjectService } from './subject.service';
import { PermissionsGuard } from '@/auth/guards/permissions.guard';
import { Permissions } from '@/auth/decorators/permissions.decorator';
@Controller('subjects')
export class SubjectsController {
  constructor(private readonly subjectsService: SubjectService) {}

  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @Permissions('configuration:manage')
  @Post()
  async create(@Body() createSubjectDto: { name: string }, @Request() req) {
    return this.subjectsService.create(createSubjectDto, req.user);
  }

  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @Permissions('configuration:read')
  @Get()
  async findAll(@Request() req) {
    return this.subjectsService.findAll(req.user.schoolId);
  }

  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @Permissions('configuration:read')
  @Get(':id')
  async findOne(@Param('id') id: string, @Request() req) {
    return this.subjectsService.findOne(id, req.user.schoolId);
  }

  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @Permissions('configuration:update')
  @Patch(':id')
  async update(@Param('id') id: string, @Body() updateSubjectDto: { name?: string }, @Request() req) {
    return this.subjectsService.update(id, updateSubjectDto, req.user);
  }

  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @Permissions('configuration:manage')
  @Delete(':id')
  async delete(@Param('id') id: string, @Request() req) {
    return this.subjectsService.delete(id, req.user);
  }
}