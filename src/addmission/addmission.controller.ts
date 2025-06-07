import {
  Controller,
  Post,
  Patch,
  Get,
  Body,
  Param,
  Request,
  UseGuards,
  UseInterceptors,
  UploadedFile,
} from '@nestjs/common';
import { AdmissionsService } from './addmission.service';
import { PermissionsGuard } from '@/auth/guards/permissions.guard';
import { JwtAuthGuard } from '@/auth/guards/jwt-auth.guards';
import { Permissions } from '@/auth/decorators/permissions.decorator';
import {
  AcceptAdmissionDto,
  CreateAdmissionDto,
  RejectAdmissionDto,
  UpdateAdmissionDto,
} from './dto/addmission.dto';
import { FileInterceptor } from '@nestjs/platform-express';
import { Request as RequestExpress } from 'express';
import { AuthenticatedUser } from '@/types/express';


@Controller('admissions')
export class AdmissionsController {
  constructor(private readonly admissionsService: AdmissionsService) {}

 
  // @Post() 
  // async createAdmission( 
  //   @Body() createAdmissionDto: CreateAdmissionDto,  
  //   @Request() req,
  // ) {
  //   return this.admissionsService.createAdmission(createAdmissionDto, req);
  // }
  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @Permissions('admission:create')
  @Post()
  @UseInterceptors(FileInterceptor('image')) // 'image' is the field name in the form-data
  async createAdmission(
    @Body() createAdmissionDto: CreateAdmissionDto,
    @Request() req,
    @UploadedFile() image?: Express.Multer.File,
  ) {
    return this.admissionsService.createAdmission(createAdmissionDto, req, image);   
  }    
    
  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @Permissions('admissions:update')
  @Patch(':id/reject') 
  async rejectAdmission(
    @Param('id') id: string,
    @Body() rejectAdmissionDto: RejectAdmissionDto,
    @Request() req,
  ) {
    return this.admissionsService.rejectAdmission(id, rejectAdmissionDto, req);
  }
  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @Permissions('sub-role:write')
  @Patch(':id/accept')
  async acceptAdmission(
    @Param('id') id: string,
    @Body() acceptAdmissionDto: AcceptAdmissionDto,
    @Request() req,
  ) {
    return this.admissionsService.acceptAdmission(id, acceptAdmissionDto, req);
  }

  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @Permissions('admissions:update')
  @Patch(':id')
  async updateAdmission(
    @Param('id') id: string,
    @Body() updateAdmissionDto: UpdateAdmissionDto,
    @Request() req,
  ) {
    return this.admissionsService.updateAdmission(id, updateAdmissionDto, req);
  }

  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @Permissions('admissions:read')
  @Get('parent/:parentId/students')
  async getStudentsByParentId(
    @Param('parentId') parentId: string,
    @Request() req,
  ) {
    return this.admissionsService.getStudentsByParentId(parentId, req);
  }

  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @Get("admission-details/:id")
  async getAdmissionDetails(
    @Param('id') id: string,
    @Request() req: RequestExpress,
  ) {
        const user = req.user as AuthenticatedUser;
    return this.admissionsService.getAdmissionDetails(id, user);
  }

  async sessionDetails(){
    // This method is not implemented in the original code snippet.     
    // You can implement it based on your requirements.
    throw new Error('Method not implemented.');
  }
}
