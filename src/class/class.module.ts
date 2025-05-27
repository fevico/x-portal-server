import { Module } from '@nestjs/common';
import { ClassesService } from './class.service';
import { ClassesController } from './class.controller';
import { PrismaModule } from '@/prisma/prisma.module';
import { HttpModule } from '@nestjs/axios';
import { LoggingService } from '@/log/logging.service';

@Module({
  imports: [PrismaModule, HttpModule],
  providers: [ClassesService, LoggingService],
  controllers: [ClassesController],
})
export class ClassModule {}
