import { Module } from '@nestjs/common';
import { ClassArmsService } from './arm.service';
import { ArmController } from './arm.controller';
import { PrismaModule } from '@/prisma/prisma.module';

@Module({
    imports: [PrismaModule],
  providers: [ClassArmsService],
  controllers: [ArmController]
})
export class ArmModule {}
