import { Body, Controller, Post } from '@nestjs/common';
import { ResultsService } from './results.service';

@Controller('results')
export class ResultsController {
  constructor(private resultsService: ResultsService) {}

  @Post('submit')
  async submitResults(@Body() results: any) {}
}
