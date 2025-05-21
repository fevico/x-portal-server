import { Controller, Get, Query, UseGuards, Request } from '@nestjs/common';
import { LoggingService } from './logging.service'; // Adjust path
import { JwtAuthGuard } from '@/auth/guards/jwt-auth.guards';
import { PermissionsGuard } from '@/auth/guards/permissions.guard';
import { Permissions } from '@/auth/decorators/permissions.decorator';

@Controller('logs')
export class LoggingController {
  constructor(private readonly loggingService: LoggingService) {}

  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @Permissions('logs:read')
  @Get()
  async getLogs(
    @Request() req,
    @Query('skip') skip?: string,
    @Query('take') take?: string,
  ) {
    return this.loggingService.getLogs(req.user, {
      skip: skip ? parseInt(skip, 10) : undefined,
      take: take ? parseInt(take, 10) : undefined,
    });
  }
}
