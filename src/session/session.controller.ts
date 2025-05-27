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
// import { PermissionsGuard } from '@/auth/guards/permissions.guard';
import { JwtAuthGuard } from '@/auth/guards/jwt-auth.guards';
// import { Permissions } from '@/auth/decorators/permissions.decorator';
import { CreateSessionDto } from './dto/session.dto';

@UseGuards(JwtAuthGuard)
@Controller('sessions')
export class SessionsController {
  constructor(private readonly sessionsService: SessionsService) {}

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

  @Get()
  async getSessionsBySchool(@Request() req: Request) {
    const sessions = await this.sessionsService.getSessionsBySchool(req);
    return {
      statusCode: 200,
      message: 'Sessions retrieved successfully',
      data: sessions,
    };
  }

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

  @Delete(':id')
  async deleteSession(@Param('id') id: string, @Request() req: Request) {
    const result = await this.sessionsService.deleteSession(id, req);
    return result;
  }
}
