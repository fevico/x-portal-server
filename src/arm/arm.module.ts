import { Module } from '@nestjs/common';
import { ClassArmsService } from './arm.service';
import { ArmController } from './arm.controller';
import { PrismaModule } from '@/prisma/prisma.module';
import { HttpModule } from '@nestjs/axios';
import { LoggingService } from '@/log/logging.service';

@Module({
  imports: [PrismaModule, HttpModule],
  providers: [ClassArmsService, LoggingService],
  controllers: [ArmController],
})
export class ArmModule {}
