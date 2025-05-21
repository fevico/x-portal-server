import { Module } from '@nestjs/common';
import { PermissionsService } from './permissions.service';
import { PermissionsController } from './permissions.controller';
import { PrismaModule } from '../prisma/prisma.module';
import { LoggingService } from '@/log/logging.service';

@Module({
  imports: [PrismaModule],
  controllers: [PermissionsController],
  providers: [PermissionsService, LoggingService],
  exports: [PermissionsService],
})
export class PermissionsModule {}
