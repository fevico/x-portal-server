import { Module } from '@nestjs/common';
import { ClassesService } from './class.service';
import { ClassesController } from './class.controller';
import { PrismaModule } from '@/prisma/prisma.module';

@Module({
  imports: [PrismaModule],
  providers: [ClassesService],
  controllers: [ClassesController]
})
export class ClassModule {}
