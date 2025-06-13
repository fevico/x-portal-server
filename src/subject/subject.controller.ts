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
  RequestTimeoutException,
} from '@nestjs/common';
import { SubjectService } from './subject.service';
import { PermissionsGuard } from '@/auth/guards/permissions.guard';
import { Permissions } from '@/auth/decorators/permissions.decorator';
import { AuthenticatedUser } from '@/types/express';
import {Request as RequestExpress} from "express"

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

  @Post("assign-subject-to-class")
  @UseGuards(JwtAuthGuard)
  async assignSubjectToClass(@Body() body: any, @Request() req: RequestExpress) {
    const user = req.user as AuthenticatedUser
    return this.subjectsService.assignSubjectToClass(body, user);
  }
}
