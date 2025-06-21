import {
  Controller,
  Get,
  Post,
  Query,
  Body,
  UseGuards,
  Request,
} from '@nestjs/common';
import { ScoreService } from './score.service';
import { JwtAuthGuard } from '@/auth/guards/jwt-auth.guards';
import { PermissionsGuard } from '@/auth/guards/permissions.guard';
import { Permissions } from '@/auth/decorators/permissions.decorator';
import { Request as RequestExpress } from 'express';
import { SaveScoresDto, FetchScoresDto } from './dto/score.dto';

@Controller('scores')
export class ScoreController {
  constructor(private scoreService: ScoreService) {}

  /**
   * Save or update scores for students
   * Handles both multi-student single subject and single student multi-subject scenarios
   */
  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @Permissions('scores:manage')
  @Post('save')
  async saveScores(
    @Body() saveScoresDto: SaveScoresDto,
    @Request() req: RequestExpress,
  ) {
    return await this.scoreService.saveScores(saveScoresDto, req);
  }

  /**
   * Fetch scores for a class arm with optional subject filtering
   */
  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @Permissions('scores:read')
  @Get('fetch')
  async fetchScores(
    @Request() req: RequestExpress,
    @Query('sessionId') sessionId: string,
    @Query('classId') classId: string,
    @Query('classArmId') classArmId: string,
    @Query('termId') termId: string,
    @Query('subjectId') subjectId?: string,
    @Query('studentId') studentId?: string, // Optional for fetching specific student's scores
  ) {
    const filters: FetchScoresDto = {
      sessionId,
      classId,
      classArmId,
      termId,
      subjectId,
      studentId,
    };

    return await this.scoreService.fetchScores(filters, req);
  }

  // Fetch scores with flexible filtering (existing method)
  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @Permissions('scores:read')
  @Get('filter')
  async fetchScoresWithFilters(
    @Request() req: RequestExpress,
    @Query('sessionId') sessionId?: string,
    @Query('classId') classId?: string,
    @Query('classArmId') classArmId?: string,
    @Query('termId') termId?: string,
    @Query('subjectId') subjectId?: string,
    @Query('studentId') studentId?: string,
  ) {
    const filters = {
      sessionId,
      classId,
      classArmId,
      termId,
      subjectId,
      studentId,
    };

    // Remove undefined values
    Object.keys(filters).forEach(
      (key) => filters[key] === undefined && delete filters[key],
    );

    return await this.scoreService.fetchScoresWithFilters(filters, req);
  }
}
