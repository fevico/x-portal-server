import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Req,
  Request,
  UploadedFile,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { ConfigurationService } from './configuration.service';
import {
  AssignClassesDto,
  AssignMarkingSchemeDto,
  CreateGradingSystemDto,
  CreateMarkingSchemeDto,
  UpdateSchoolInfoDto,
} from './dto/configuration';
import { JwtAuthGuard } from '@/auth/guards/jwt-auth.guards';
import { Request as RequestExpress } from 'express';
import { AuthenticatedUser } from '@/types/express';
import { FileInterceptor } from '@nestjs/platform-express';

@Controller('configuration')
export class ConfigurationController {
  constructor(private configurationService: ConfigurationService) {}

  @Patch('school-information')
  @UseGuards(JwtAuthGuard)
  @UseInterceptors(FileInterceptor('logo'))
  @UseInterceptors(FileInterceptor('schoolHeadSignature'))
  @UseInterceptors(FileInterceptor('principalSignature'))
  @UseInterceptors(FileInterceptor('bursarSignature'))
  async updateSchoolInformation(
    @Body() body: UpdateSchoolInfoDto,
    @Request() req: RequestExpress,
    @UploadedFile() logo?: Express.Multer.File,
    @UploadedFile() schoolHeadSignature?: Express.Multer.File,
    @UploadedFile() principalSignature?: Express.Multer.File,
    @UploadedFile() bursarSignature?: Express.Multer.File,
  ) {
    const user = req.user as AuthenticatedUser;
    return this.configurationService.updateSchoolInformation(
      body,
      user,
      logo,
      schoolHeadSignature,
      principalSignature,
      bursarSignature,
    );
  }

  @Get('school-information')
  @UseGuards(JwtAuthGuard)
  async getSchoolInformation(@Request() req: RequestExpress) {
    const user = req.user as AuthenticatedUser;
    return this.configurationService.getSchoolInformation(user);
  }

  // Create Marking Scheme
  @UseGuards(JwtAuthGuard)
  @Post()
  async createMarkingScheme(
    @Body() dto: CreateMarkingSchemeDto,
    @Req() req: any,
  ) {
    return await this.configurationService.createMarkingScheme({
      ...dto,
      schoolId: req.user.schoolId,
      createdBy: req.user.id,
    });
  }

  // Assign Marking Scheme to Classes and Term Definitions
  @UseGuards(JwtAuthGuard)
  @Post(':id/assign')
  async assignMarkingScheme(
    @Param('id') id: string,
    @Body() dto: AssignMarkingSchemeDto,
    @Req() req: any,
  ) {
    return await this.configurationService.assignMarkingSchemeToClassesAndTerms(
      id,
      dto,
      req,
    );
  }

  // Update Marking Scheme
  @UseGuards(JwtAuthGuard)
  @Patch(':id')
  async updateMarkingScheme(
    @Param('id') id: string,
    @Body() dto: CreateMarkingSchemeDto,
    @Req() req: any,
  ) {
    return await this.configurationService.updateMarkingScheme(id, dto, req);
  }

  // Delete Marking Scheme
  @UseGuards(JwtAuthGuard)
  @Delete(':id')
  async deleteMarkingScheme(@Param('id') id: string, @Req() req: any) {
    return await this.configurationService.deleteMarkingScheme(id, req);
  }

  // Get Marking Scheme by ID
  @UseGuards(JwtAuthGuard)
  @Get(':id')
  async getMarkingScheme(@Param('id') id: string) {
    return await this.configurationService.getMarkingScheme(id);
  }
  // Create Grading System
  @UseGuards(JwtAuthGuard)
  @Post()
  async createGradingSystem(
    @Body() dto: CreateGradingSystemDto,
    @Req() req: any,
  ) {
    return await this.configurationService.createGradingSystem(dto, req);
  }

  // Assign Grading System to Classes
  @UseGuards(JwtAuthGuard)
  @Post(':id/assign-classes')
  async assignGradingSystemToClasses(
    @Param('id') id: string,
    @Body() dto: AssignClassesDto,
    @Req() req: any,
  ) {
    return await this.configurationService.assignGradingSystemToClasses(
      id,
      dto,
      req,
    );
  }

  // Fetch Grading System, Grades, and Assigned Classes
  @UseGuards(JwtAuthGuard)
  @Get(':id')
  async getGradingSystem(@Param('id') id: string, @Req() req: any) {
    return await this.configurationService.getGradingSystem(id, req);
  }

  // Update Grading System and Grades
  @UseGuards(JwtAuthGuard)
  @Patch(':id')
  async updateGradingSystem(
    @Param('id') id: string,
    @Body() dto: CreateGradingSystemDto,
    @Req() req: any,
  ) {
    return await this.configurationService.updateGradingSystem(id, dto, req);
  }

  // New Delete Endpoint
  @UseGuards(JwtAuthGuard)
  @Delete(':id')
  async deleteGradingSystem(@Param('id') id: string, @Req() req: any) {
    return await this.configurationService.deleteGradingSystem(id, req);
  }
}
