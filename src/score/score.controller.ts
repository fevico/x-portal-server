import {
  Controller,
  Get,
  Query,
  UseGuards,
  Request,
  // Post,
  // Body,
  // Req,
} from '@nestjs/common';
import { ScoreService } from './score.service';
import { JwtAuthGuard } from '@/auth/guards/jwt-auth.guards';
import { PermissionsGuard } from '@/auth/guards/permissions.guard';
import { Permissions } from '@/auth/decorators/permissions.decorator';
import { Request as RequestExpress } from 'express';
// import {
//   FetchClassArmResultsDto,
//   FetchStudentResultDto,
//   FetchStudentScoresDto,
//   SaveStudentScoresDto,
// } from './dto/score.dto';

@Controller('scores')
export class ScoreController {
  constructor(private scoreService: ScoreService) {}

  //   // Save Student Scores
  //   @UseGuards(JwtAuthGuard)
  //   @Post()
  //   async saveStudentScores(@Body() dto: SaveStudentScoresDto, @Req() req: any) {
  //     return await this.scoreService.saveStudentScores(dto, req);
  //   }

  //   // Fetch Student Scores
  //   @UseGuards(JwtAuthGuard)
  //   @Get()
  //   async fetchStudentScores(@Query() dto: FetchStudentScoresDto) {
  //     return await this.scoreService.fetchStudentScores(dto);
  //   }

  //   // Fetch Student Result
  //   @UseGuards(JwtAuthGuard)
  //   @Get('result')
  //   async fetchStudentResult(@Query() dto: FetchStudentResultDto) {
  //     return await this.scoreService.fetchStudentResult(dto);
  //   }

  //   // Fetch All Student Results in a Class Arm
  //   @UseGuards(JwtAuthGuard)
  //   @Get('class-arm')
  //   async fetchClassArmResults(@Query() dto: FetchClassArmResultsDto) {
  //     return await this.scoreService.fetchClassArmResults(dto);
  //   }

  // Fetch scores with flexible filtering
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
