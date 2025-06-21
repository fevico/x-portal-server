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
} from '@nestjs/common';
import { ResultsService } from './results.service';
import { Request as RequestExpress } from 'express';
import { computeResultsDto, GetResultsQueryDto } from './dto/results.dto';
import { JwtAuthGuard } from '@/auth/guards/jwt-auth.guards';

@UseGuards(JwtAuthGuard)
@Controller('results')
export class ResultsController {
  constructor(private resultsService: ResultsService) {}

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

  @Get()
  async getResults(
    @Query() query: GetResultsQueryDto,
    @Request() req: RequestExpress,
  ) {
    return this.resultsService.getAllResults(query, req);
  }

  @Get(':id')
  async getResultById(@Param('id') id: string, @Request() req: RequestExpress) {
    return this.resultsService.getResultBatchById(id, req);
  }

  @Patch(':id/approve')
  async approveResult(@Param('id') id: string, @Request() req: RequestExpress) {
    return this.resultsService.approveResult(id, req);
  }
}
