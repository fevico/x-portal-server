import {
  Controller,
  Post,
  Get,
  Patch,
  Delete,
  Body,
  Param,
  Request,
  UseGuards,
} from '@nestjs/common';

import { SessionsService } from './session.service';
import { PermissionsGuard } from '@/auth/guards/permissions.guard';
import { JwtAuthGuard } from '@/auth/guards/jwt-auth.guards';
import { Permissions } from '@/auth/decorators/permissions.decorator';
import { CreateSessionDto, UpdateSessionDto } from './dto/session.dto';

@Controller('sessions')
export class SessionsController {
  constructor(private readonly sessionsService: SessionsService) {}

  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @Permissions('sub-role:write')
  @Post()
  async createSession(
    @Body() createSessionDto: CreateSessionDto,
    @Request() req,
  ) {
    return this.sessionsService.createSession(createSessionDto, req);
  }

  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @Permissions('sub-role:read')
  @Get(':id')
  async getSession(@Param('id') id: string, @Request() req) {
    return this.sessionsService.getSession(id, req);
  }

  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @Permissions('sub-role:read')
  @Get('school/:schoolId')
  async getSessionsBySchool(
    @Param('schoolId') schoolId: string,
    @Request() req,
  ) {
    return this.sessionsService.getSessionsBySchool(schoolId, req);
  }

  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @Permissions('sub-role:write')
  @Patch(':id')
  async updateSession(
    @Param('id') id: string,
    @Body() updateSessionDto: UpdateSessionDto,
    @Request() req,
  ) {
    return this.sessionsService.updateSession(id, updateSessionDto, req);
  }

  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @Permissions('sub-role:write')
  @Delete(':id')
  async deleteSession(@Param('id') id: string, @Request() req) {
    return this.sessionsService.deleteSession(id, req);
  }
}
