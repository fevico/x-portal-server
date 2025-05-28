import { Module } from '@nestjs/common';
import { SessionsService } from './session.service';
import { SessionsController } from './session.controller';
import { PrismaModule } from '@/prisma/prisma.module';
import { HttpModule } from '@nestjs/axios';
import { LoggingService } from '@/log/logging.service';

@Module({
  imports: [PrismaModule, HttpModule],
  controllers: [SessionsController],
  providers: [SessionsService, LoggingService],
})
export class SessionModule {}
