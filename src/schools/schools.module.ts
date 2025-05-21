import { Module } from '@nestjs/common';
import { SchoolsService } from './schools.service';
import { SchoolsController } from './schools.controller';
import { PrismaModule } from '../prisma/prisma.module';
import { HttpModule } from '@nestjs/axios';
import { LoggingService } from '@/log/logging.service';

@Module({
  imports: [PrismaModule, HttpModule],
  controllers: [SchoolsController],
  providers: [SchoolsService, LoggingService],
  exports: [SchoolsService],
})
export class SchoolsModule {}
