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
  UpdateContinuousAssessmentDto,
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
  @Post('marking-scheme')
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

  // get all marking schemes
  @UseGuards(JwtAuthGuard)
  @Get('marking-scheme')
  async getAllMarkingSchemes(@Req() req: any) {
    return await this.configurationService.getAllMarkingSchemes(req);
  }

  // Assign Marking Scheme to Classes and Term Definitions
  @UseGuards(JwtAuthGuard)
  @Post('marking-scheme/:id/assign')
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
  @Patch('marking-scheme/:id')
  async updateMarkingScheme(
    @Param('id') id: string,
    @Body() dto: CreateMarkingSchemeDto,
    @Req() req: any,
  ) {
    return await this.configurationService.updateMarkingScheme(id, dto, req);
  }

  // Delete Marking Scheme
  @UseGuards(JwtAuthGuard)
  @Delete('marking-scheme/:id')
  async deleteMarkingScheme(@Param('id') id: string, @Req() req: any) {
    return await this.configurationService.deleteMarkingScheme(id, req);
  }

  // Get Marking Scheme by Class and Term (more specific route first)
  @UseGuards(JwtAuthGuard)
  @Get('marking-scheme/class/:classId/term/:termDefinitionId')
  async getMarkingSchemeByClassAndTerm(
    @Param('classId') classId: string,
    @Param('termDefinitionId') termDefinitionId: string,
    @Request() req: RequestExpress,
  ) {
    return this.configurationService.getMarkingSchemeByClassAndTerm(
      classId,
      termDefinitionId,
      req,
    );
  }

  // Get Marking Scheme by ID (general route after specific)
  @UseGuards(JwtAuthGuard)
  @Get('marking-scheme/:id')
  async getMarkingScheme(@Param('id') id: string) {
    return await this.configurationService.getMarkingScheme(id);
  }

  // get all continuous assesment
  @UseGuards(JwtAuthGuard)
  @Get('continuous-assessment')
  async getContinuousAssessments(@Req() req: any) {
    return await this.configurationService.getContinuousAssessments(req);
  }

  @UseGuards(JwtAuthGuard)
  @Patch('continuous-assessment/:id')
  async updateContinuousAssessment(
    @Param('id') id: string,
    @Body() dto: UpdateContinuousAssessmentDto,
    @Req() req: any,
  ) {
    return await this.configurationService.updateContinuousAssessment(
      id,
      dto,
      req,
    );
  }

  // get all grading systems
  @UseGuards(JwtAuthGuard)
  @Get('grading-system')
  async getAllGradingSystems(@Req() req: any) {
    return await this.configurationService.getAllGradingSystems(req);
  }
  // Create Grading System
  @UseGuards(JwtAuthGuard)
  @Post('grading-system')
  async createGradingSystem(
    @Body() dto: CreateGradingSystemDto,
    @Req() req: any,
  ) {
    return await this.configurationService.createGradingSystem(dto, req);
  }

  // Assign Grading System to Classes
  @UseGuards(JwtAuthGuard)
  @Post('grading-system/:id/assign')
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
  @Get('grading-system/:id')
  async getGradingSystem(@Param('id') id: string, @Req() req: any) {
    return await this.configurationService.getGradingSystem(id, req);
  }

  // Update Grading System and Grades
  @UseGuards(JwtAuthGuard)
  @Patch('grading-system/:id')
  async updateGradingSystem(
    @Param('id') id: string,
    @Body() dto: CreateGradingSystemDto,
    @Req() req: any,
  ) {
    return await this.configurationService.updateGradingSystem(id, dto, req);
  }

  // New Delete Endpoint
  @UseGuards(JwtAuthGuard)
  @Delete('grading-system/:id')
  async deleteGradingSystem(@Param('id') id: string, @Req() req: any) {
    return await this.configurationService.deleteGradingSystem(id, req);
  }

  // get terms
  @UseGuards(JwtAuthGuard)
  @Get('terms')
  async getTerms(@Request() req: RequestExpress) {
    return this.configurationService.getTerms(req);
  }
}
