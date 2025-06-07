import { Permissions } from '@/auth/decorators/permissions.decorator';
import { JwtAuthGuard } from '@/auth/guards/jwt-auth.guards';
import { PermissionsGuard } from '@/auth/guards/permissions.guard';
import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Request,
  UseGuards,
} from '@nestjs/common';
import { ClassesService } from './class.service';
import { AssignClassArmsDto } from './dto/assign.class.dto';
import { Request as RequestExpress } from 'express';
import { AuthenticatedUser } from '@/types/express';
import { ClassCategory } from '@prisma/client';

@Controller('classes')
export class ClassesController {
  constructor(private readonly classesService: ClassesService) {}

  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @Permissions('configuration:manage')
  @Post()
  async create(
    @Body() createClassDto: { name: string; category: ClassCategory },
    @Request() req,
  ) {
    return this.classesService.create(createClassDto, req);
  }

  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @Permissions('configuration:read')
  @Get()
  async findAll(@Request() req) {
    return this.classesService.findAll(req);
  }

  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @Post('/assign/arms')
  @Permissions('configuration:manage')
  async assignClassArms(
    @Body() assignClassArmsDto: AssignClassArmsDto,
    @Request() req: RequestExpress,
  ) {
    // Extract the assignments array from the DTO
    return this.classesService.assignArms(assignClassArmsDto.assignments, req);
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
  async update(
    @Param('id') id: string,
    @Body() updateClassDto: { name?: string; category?: ClassCategory },
    @Request() req: RequestExpress,
  ) {
    const user = req.user as AuthenticatedUser;

    return this.classesService.update(id, updateClassDto, user);
  }

  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @Permissions('configuration:manage')
  @Delete(':id')
  async delete(@Param('id') id: string, @Request() req) {
    return this.classesService.delete(id, req.user);
  }

  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @Post("create-class-category")
  async createClassCategory(
    @Body() body: any,
    @Request() req: RequestExpress,
  ) {
    const user = req.user as AuthenticatedUser;
    if (!user.schoolId) {
      throw new Error('User must be associated with a school');
    }
    return this.classesService.createClassCategory(body, user);
  }

  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @Get("class-categories")
  async getAllClassCategories(@Request() req: RequestExpress) {
    const user = req.user as AuthenticatedUser;
    if (!user.schoolId) {
      throw new Error('User must be associated with a school');
    }
    return this.classesService.getAllClassCategories(user);
  }

  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @Get("class-category/:id")
  async getClassCategoryById(
    @Param('id') id: string,
    @Request() req: RequestExpress,
  ) {
    const user = req.user as AuthenticatedUser;
    if (!user.schoolId) {
      throw new Error('User must be associated with a school');
    }
    return this.classesService.getClassCategoryById(id, user);
  }

  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @Patch("class-category/:id")
  async updateClassCategory(
    @Param('id') id: string,
    @Body() body: any,
    @Request() req: RequestExpress,
  ) {
    const user = req.user as AuthenticatedUser;
    if (!user.schoolId) {
      throw new Error('User must be associated with a school');
    }
    return this.classesService.updateClassCategory(id, body, user);
  }

  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @Patch("class-category/:id")
  async deleteClassCategory(@Param('id') id: string, @Request() req: RequestExpress) {
    const user = req.user as AuthenticatedUser;
    if (!user.schoolId) {
      throw new Error('User must be associated with a school'); 
    }
    return this.classesService.deleteClassCategory(id, user);
  }              
}
