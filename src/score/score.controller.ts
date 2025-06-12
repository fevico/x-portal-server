import { Controller, Post, Get, Body, Query, Req, UseGuards } from '@nestjs/common';
import { ScoreService } from './score.service';
import { JwtAuthGuard } from '@/auth/guards/jwt-auth.guards';
import { FetchClassArmResultsDto, FetchStudentResultDto, FetchStudentScoresDto, SaveStudentScoresDto } from './dto/score.dto';

@Controller('scores')
export class ScoreController {
  constructor(private scoreService: ScoreService) {}

  // Save Student Scores
  @UseGuards(JwtAuthGuard)
  @Post()
  async saveStudentScores(@Body() dto: SaveStudentScoresDto, @Req() req: any) {
    return await this.scoreService.saveStudentScores(dto, req);
  }

  // Fetch Student Scores
  @UseGuards(JwtAuthGuard)
  @Get()
  async fetchStudentScores(@Query() dto: FetchStudentScoresDto) {
    return await this.scoreService.fetchStudentScores(dto);
  }

  // Fetch Student Result
  @UseGuards(JwtAuthGuard)
  @Get('result')
  async fetchStudentResult(@Query() dto: FetchStudentResultDto) {
    return await this.scoreService.fetchStudentResult(dto);
  }

  // Fetch All Student Results in a Class Arm
  @UseGuards(JwtAuthGuard)
  @Get('class-arm')
  async fetchClassArmResults(@Query() dto: FetchClassArmResultsDto) {
    return await this.scoreService.fetchClassArmResults(dto);
  }
}