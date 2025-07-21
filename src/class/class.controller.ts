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
  Query,
  Request,
  UnauthorizedException,
  UseGuards,
} from '@nestjs/common';
import { ClassesService } from './class.service';
import { AssignClassArmsDto } from './dto/assign.class.dto';
import { Request as RequestExpress } from 'express';
import { AuthenticatedUser } from '@/types/express';
import { GetClassArmTeacherDto } from './dto/class-arm-teacher.dto';

@Controller('classes')
export class ClassesController {
  constructor(private readonly classesService: ClassesService) {}

  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @Permissions('configuration:manage')
  @Post()
  async create(
    @Body() createClassDto: { name: string; category: string },
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

  @Get('public')
  async findAllPublic(@Query('schoolId') schoolId: string) {
    return this.classesService.findAllPublic(schoolId);
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
    @Body()
    updateClassDto: { name?: string; category?: string; isActive?: boolean },
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
  @Post('category')
  async createClassCategory(@Body() body: any, @Request() req: RequestExpress) {
    const user = req.user as AuthenticatedUser;
    if (!user.schoolId) {
      throw new Error('User must be associated with a school');
    }
    return this.classesService.createClassCategory(body, user);
  }

  @UseGuards(JwtAuthGuard)
  @Get('category/get/all')
  async getAllClassCategories(@Request() req: RequestExpress) {
    const user = req.user as AuthenticatedUser;
    if (!user.schoolId) {
      throw new Error('User must be associated with a school');
    }
    return this.classesService.getAllClassCategories(user);
  }

  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @Get('category/:id')
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
  @Patch('category/:id')
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

  @UseGuards(JwtAuthGuard)
  @Delete('category/:id')
  async deleteClassCategory(
    @Param('id') id: string,
    @Request() req: RequestExpress,
  ) {
    const user = req.user as AuthenticatedUser;
    if (!user.schoolId) {
      throw new Error('User must be associated with a school');
    }
    return this.classesService.deleteClassCategory(id, user);
  }

  // Get all classes and their class arms by session ID
  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @Permissions('configuration:read')
  @Get('session/:sessionId')
  async getClassesBySession(
    @Param('sessionId') sessionId: string,
    @Request() req: RequestExpress,
  ) {
    const user = req.user as AuthenticatedUser;
    if (!user.schoolId) {
      throw new Error('User must be associated with a school');
    }
    return this.classesService.getClassesBySession(sessionId, user);
  }

  // get students
  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @Permissions('configuration:read')
  @Get('/all/get-students')
  async getStudentClassAssignment(
    @Request() req: RequestExpress,
    @Query('sessionId') sessionId?: string,
    @Query('classId') classId?: string,
    @Query('classArmId') classArmId?: string,
    @Query('q') q?: string,
    @Query('gender') gender?: boolean,
    @Query('alumni') alumni?: boolean,
    @Query('page') page?: number,
    @Query('limit') limit?: number,
  ) {
    const user = req.user as AuthenticatedUser;
    if (!user.schoolId) {
      throw new UnauthorizedException('User must be associated with a school');
    }
    return this.classesService.getStudentClassAssignment(user, {
      sessionId,
      classId,
      classArmId,
      q,
      gender,
      alumni,
      page,
      limit,
    });
  }

  @UseGuards(JwtAuthGuard)
  @Post('/class-arm-teacher/assign')
  async assignClassArmTeacher(
    @Body()
    dto: {
      staffId: string;
      assignments: Array<{ classId: string; classArmIds: string[] }>;
    },
    @Request() req: RequestExpress,
    @Query() query?: { remove?: boolean },
  ) {
    const user = req.user as AuthenticatedUser;
    console.log('Assigning class arm teacher:', req.body, query);
    return await this.classesService.assignClassArmTeacher(dto, query, user);
  }

  @UseGuards(JwtAuthGuard)
  @Get('/class/arm-teacher')
  async getClassArmTeacher(
    @Query() dto: GetClassArmTeacherDto,
    @Request() req: RequestExpress,
  ) {
    return await this.classesService.getClassArmTeacher(dto, req.user);
  }

  @UseGuards(JwtAuthGuard)
  @Get('/school/teachers')
  async getSchoolTeachers(
    @Request() req,
    @Query('q') q?: string,
    @Query('page') page?: number,
    @Query('limit') limit?: number,
  ) {
    const schoolId = req.user.schoolId;
    // Fetch teachers from staff model
    const teachers = await this.classesService.getSchoolTeachers(schoolId, {
      q,
      page,
      limit,
    });
    return {
      statusCode: 200,
      message: 'Teachers fetched successfully',
      data: teachers,
    };
  }
}
