import { Module } from '@nestjs/common';
import { AdmissionsController } from './addmission.controller';
import { AdmissionsService } from './addmission.service';
import { HttpModule } from '@nestjs/axios';
import { PrismaModule } from '@/prisma/prisma.module';
import { LoggingService } from '@/log/logging.service';

@Module({
  imports: [PrismaModule, HttpModule],
  controllers: [AdmissionsController],
  providers: [AdmissionsService, LoggingService],
})
export class AdmissionsModule {}
