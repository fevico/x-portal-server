import {
  Controller,
  Post,
  Patch,
  Get,
  Body,
  Param,
  Request,
  UseGuards,
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

@Controller('admissions')
export class AdmissionsController {
  constructor(private readonly admissionsService: AdmissionsService) {}

  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @Permissions('admissions:create')
  @Post()
  async createAdmission(
    @Body() createAdmissionDto: CreateAdmissionDto,
    @Request() req,
  ) {
    return this.admissionsService.createAdmission(createAdmissionDto, req);
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
}
