import {
  Body,
  Controller,
  Get,
  Post,
  Query,
  Request,
  UseGuards,
  Param,
  Patch,
  BadRequestException,
} from '@nestjs/common';
import { ResultsService } from './results.service';
import { Request as RequestExpress } from 'express';
import { computeResultsDto, GetResultsQueryDto } from './dto/results.dto';
import { JwtAuthGuard } from '@/auth/guards/jwt-auth.guards';

@UseGuards(JwtAuthGuard)
@Controller('results')
export class ResultsController {
  constructor(private resultsService: ResultsService) {}

  @Get()
  async getResults(
    @Query() query: GetResultsQueryDto,
    @Request() req: RequestExpress,
  ) {
    return this.resultsService.getAllResults(query, req);
  }

  @Post('submit')
  async computeResults(
    @Body() results: computeResultsDto,
    @Request() req: RequestExpress,
  ) {
    return this.resultsService.computeResults(
      results.sessionId,
      results.termId,
      results.classId,
      results.classArmId,
      results.resultScope,
      results.resultTypeId,
      req,
    );
  }

  @Get(':id')
  async getResultById(
    @Param('id') id: string,
    @Request() req: RequestExpress,
    @Query('studentId') studentId?: string,
  ) {
    return this.resultsService.getResultBatchById(id, req, studentId);
  }

  @Get(':id/:type')
  async getResultByIdWithType(
    @Param('id') id: string,
    @Param('type') type: string,
    @Request() req: RequestExpress,
  ) {
    // Validate the type parameter
    if (type !== 'grades' && type !== 'scores') {
      throw new BadRequestException('Type must be either "grades" or "scores"');
    }

    return this.resultsService.getResultBatchByIdWithType(
      id,
      type as 'grades' | 'scores',
      req,
    );
  }

  @Patch(':id/approve')
  async approveResult(@Param('id') id: string, @Request() req: RequestExpress) {
    return this.resultsService.approveResult(id, req);
  }

  @Get('transcript/:classCategoryId/:studentIdentifier')
  async getStudentTranscript(
    @Param('classCategoryId') classCategoryId: string,
    @Param('studentIdentifier') studentIdentifier: string,
    @Request() req: RequestExpress,
  ) {
    return this.resultsService.getStudentTranscriptByCategory(
      classCategoryId,
      decodeURIComponent(studentIdentifier), // Decode in case name has spaces
      req,
    );
  }

  @Get('promotion/:sessionId/:classId/:classArmId')
  async getStudentsForPromotion(
    @Param('sessionId') sessionId: string,
    @Param('classId') classId: string,
    @Param('classArmId') classArmId: string,
    @Request() req: RequestExpress,
  ) {
    return this.resultsService.getStudentsForPromotion(
      sessionId,
      classId,
      classArmId,
      req,
    );
  }

  @Post('promotion/promote')
  async promoteStudents(
    @Body()
    promotionData: {
      studentPromotions: Array<{
        studentId: string;
        promoteAction: boolean;
      }>;
      newSessionId: string;
      newClassId: string;
      newClassArmId: string;
      currentSessionId: string;
      currentClassId: string;
      currentClassArmId: string;
      graduatingClass?: boolean;
    },
    @Request() req: RequestExpress,
  ) {
    return this.resultsService.promoteStudents(
      promotionData.studentPromotions,
      promotionData.newSessionId,
      promotionData.newClassId,
      promotionData.newClassArmId,
      promotionData.currentSessionId,
      promotionData.currentClassId,
      promotionData.currentClassArmId,
      promotionData.graduatingClass || false,
      req,
    );
  }
}
