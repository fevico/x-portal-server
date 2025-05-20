import { Permissions } from '@/auth/decorators/permissions.decorator';
import { JwtAuthGuard } from '@/auth/guards/jwt-auth.guards';
import { PermissionsGuard } from '@/auth/guards/permissions.guard';
import { Body, Controller, Delete, Get, Param, Patch, Post, Request, UseGuards } from '@nestjs/common';
import { ClassesService } from './class.service';
import { AssignClassArmsDto } from './dto/assign.class.dto';
import { Request as RequestExpress } from 'express';
import { AuthenticatedUser } from '@/types/express';

@Controller('classes')
export class ClassesController {
  constructor(private readonly classesService: ClassesService) {}

  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @Permissions('configuration:manage')
  @Post()
  async create(@Body() createClassDto: { name: string }, @Request() req) {
    return this.classesService.create(createClassDto, req.user);
  }

  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @Permissions('configuration:read')
  @Get()
  async findAll(@Request() req) {
    return this.classesService.findAll(req.user.schoolId);
  }

  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @Permissions('configuration:read')
  @Get(':id')
  async findOne(@Param('id') id: string, @Request() req) {
    return this.classesService.findOne(id, req.user.schoolId);
  }

  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @Permissions('configuration:update')
  @Patch(':id')
  async update(@Param('id') id: string, @Body() updateClassDto: { name?: string }, @Request() req: RequestExpress) {
    const user = req.user as AuthenticatedUser;

    return this.classesService.update(id, updateClassDto, user);
  }

  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @Permissions('configuration:manage')
  @Delete(':id')
  async delete(@Param('id') id: string, @Request() req) {
    return this.classesService.delete(id, req.user);
  }

  @Post()
  @Permissions('configuration:manage')
  async assignClassArms(
    @Body() assignClassArmsDto: AssignClassArmsDto, @Request() req: RequestExpress,
    // @GetUser() user: { id: string; schoolId: string },
  ) {
        const user = req.user as AuthenticatedUser;
    
    return this.classesService.assignClassArms(assignClassArmsDto, user);
  }
}
