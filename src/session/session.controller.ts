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
  Query,
} from '@nestjs/common';

import { SessionsService } from './session.service';
// import { PermissionsGuard } from '@/auth/guards/permissions.guard';
import { JwtAuthGuard } from '@/auth/guards/jwt-auth.guards';
// import { Permissions } from '@/auth/decorators/permissions.decorator';
import { AssignClassToSessionDto, CreateSessionDto } from './dto/session.dto';
import { PermissionsGuard } from '@/auth/guards/permissions.guard';
import { AuthenticatedUser } from '@/types/express';
import { Request as RequestExpress } from 'express';

@Controller('sessions')
export class SessionsController {
  constructor(private readonly sessionsService: SessionsService) {}

  @UseGuards(JwtAuthGuard, PermissionsGuard)
  // @Permissions('sub-role:write')
  @Post()
  async createSession(
    @Body() createSessionDto: CreateSessionDto,
    @Request() req: Request,
  ) {
    const result = await this.sessionsService.createSession(
      createSessionDto,
      req,
    );
    return result;
  }

  @Get('public')
  async getSessionsBySchoolPublic(@Query('schoolId') schoolId: string) {
    const sessions =
      await this.sessionsService.getSessionsBySchoolPublic(schoolId);
    return {
      statusCode: 200,
      message: 'Sessions retrieved successfully',
      data: sessions,
    };
  }

  @Get('fetch-class-class-arm/:sessionId')
  @UseGuards(JwtAuthGuard)
  async getSessionClassArm(
    @Param('sessionId') sessionId: string,
    @Request() req: RequestExpress,
  ) {
    const user = req.user as AuthenticatedUser;
    const session = await this.sessionsService.getSessionClassArm(
      sessionId,
      user,
    );
    return {
      statusCode: 200,
      message: 'Session retrieved successfully',
      data: session,
    };
  }

  @UseGuards(JwtAuthGuard)
  @Get()
  async getSessionsBySchool(@Request() req: Request) {
    const sessions = await this.sessionsService.getSessionsBySchool(req);
    return {
      statusCode: 200,
      message: 'Sessions retrieved successfully',
      data: sessions,
    };
  }

  @UseGuards(JwtAuthGuard)
  @Patch(':id')
  async updateSession(
    @Param('id') id: string,
    @Body() createSessionDto: CreateSessionDto,
    @Request() req: Request,
  ) {
    const result = await this.sessionsService.updateSession(
      id,
      createSessionDto,
      req,
    );
    return result;
  }

  @UseGuards(JwtAuthGuard)
  @Delete(':id')
  async deleteSession(@Param('id') id: string, @Request() req: Request) {
    const result = await this.sessionsService.deleteSession(id, req);
    return result;
  }

  @Post('assign-class-to-session/:id')
  @UseGuards(JwtAuthGuard)
  async assignClassToSession(
    @Param('id') sessionId: string,
    @Body() dto: AssignClassToSessionDto,
    @Request() req: RequestExpress,
  ) {
    return this.sessionsService.assignClassToSession(sessionId, dto, req);
  }
}
