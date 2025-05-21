import { Module } from '@nestjs/common';
import { HttpModule } from '@nestjs/axios';
import { LoggingService } from './logging.service';
import { PrismaModule } from '../prisma/prisma.module'; // Adjust path
import { LoggingController } from './logging.controller';

@Module({
  controllers: [LoggingController],
  providers: [LoggingService],
  imports: [HttpModule, PrismaModule],
  exports: [LoggingService],
})
export class LoggingModule {}
