import { Module } from '@nestjs/common';
import { LessonPlanService } from './lesson-plan.service';
import { LessonPlanController } from './lesson-plan.controller';
import { PrismaModule } from '@/prisma/prisma.module';

@Module({
  imports: [PrismaModule],
  providers: [LessonPlanService],
  controllers: [LessonPlanController]
})
export class LessonPlanModule {}
