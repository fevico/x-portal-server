import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  UseGuards,
  ForbiddenException,
  NotFoundException,
  Request,
  Query,
  Req,
  UseInterceptors,
  UploadedFile,
} from '@nestjs/common';
import { SchoolsService } from './schools.service';

import { RolesGuard } from '@/auth/guards/roles.guard';
import { JwtAuthGuard } from '@/auth/guards/jwt-auth.guards';
import { PermissionsGuard } from '@/auth/guards/permissions.guard';
import { Roles } from '@/auth/decorators/auth.decorator';
import { Request as RequestExpress } from 'express';
import { AuthenticatedUser } from '@/types/express';
import {
  CreateSchoolDto,
  GetSchoolsQueryDto,
  UpdateSchoolDto,
} from './dto/school.dto';
import { Permissions } from '@/auth/decorators/permissions.decorator';
import { FileInterceptor } from '@nestjs/platform-express';
import { FileUploadMiddleware } from '@/middleware/fileUpload';

@Controller('schools')
export class SchoolsController {
  constructor(private readonly schoolsService: SchoolsService) {}

  @Get('school-class-statistics')
  @UseGuards(JwtAuthGuard)
  async getSchoolClassStatistics(@Req() req: RequestExpress) {
    const user = req.user as AuthenticatedUser;
    return this.schoolsService.getSchoolClassStatistics(user.schoolId);
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('superAdmin')
  @Get('list')
  async getSchools(
    @Query() query: GetSchoolsQueryDto,
    @Request() req: RequestExpress,
  ) {
    const user = req.user as AuthenticatedUser;
    if (user.role !== 'superAdmin') {
      throw new ForbiddenException('Only superAdmin can access all schools');
    }
    const pageNum = parseInt(query.page) || 1;
    const limitNum = parseInt(query.limit) || 5;
    return this.schoolsService.getSchools({
      search: query.search,
      page: pageNum,
      limit: limitNum,
    });
  }

  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @Permissions('school:read')
  @Get(':id')
  async getSchoolById(@Param('id') id: string, @Request() req: RequestExpress) {
    const user = req.user as AuthenticatedUser;
    if (user.role !== 'superAdmin' && user.schoolId !== id) {
      throw new ForbiddenException('Unauthorized to access this school');
    }
    const school = await this.schoolsService.getSchoolById(id);
    if (!school) {
      throw new NotFoundException('School not found');
    }
    return school;
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('superAdmin')
  @Post()
  async createSchool(
    @Body() createSchoolDto: CreateSchoolDto,
    @Request() req: RequestExpress,
  ) {
    return this.schoolsService.createSchool(createSchoolDto, req);
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('superAdmin')
  @UseInterceptors(FileInterceptor('logo', FileUploadMiddleware.multerOptions))
  @Patch(':id')
  async updateSchool(
    @Param('id') id: string,
    @Body() updateSchoolDto: UpdateSchoolDto,
    @Request() req: RequestExpress,
    @UploadedFile() file: Express.Multer.File,
  ) {
    const user = req.user as AuthenticatedUser;
    const school = await this.schoolsService.updateSchool(
      id,
      updateSchoolDto,
      user,
      // file,
    );
    if (!school) {
      throw new NotFoundException('School not found');
    }
    return school;
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('superAdmin')
  @Delete(':id')
  async deleteSchool(@Param('id') id: string, @Request() req: RequestExpress) {
    const user = req.user as AuthenticatedUser;
    await this.schoolsService.deleteSchool(id, user);
    return { message: 'School deleted successfully' };
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('superAdmin')
  @Patch(':id/toggle-active')
  async toggleSchoolActive(
    @Param('id') id: string,
    @Request() req: RequestExpress,
  ) {
    const user = req.user as AuthenticatedUser;
    const school = await this.schoolsService.toggleSchoolActive(id, user);
    if (!school) {
      throw new NotFoundException('School not found');
    }
    return school;
  }
}
