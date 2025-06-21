import { Module } from '@nestjs/common';
import { ResultsService } from './results.service';
import { ResultsController } from './results.controller';
import { LoggingService } from '@/log/logging.service';
import { PrismaModule } from '@/prisma/prisma.module';
import { HttpModule } from '@nestjs/axios';

@Module({
  imports: [PrismaModule, HttpModule],
  providers: [ResultsService, LoggingService],
  controllers: [ResultsController],
})
export class ResultsModule {}
