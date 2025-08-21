import { Module } from '@nestjs/common';
import { LessonPlanService } from './lesson-plan.service';
import { LessonPlanController } from './lesson-plan.controller';

@Module({
  providers: [LessonPlanService],
  controllers: [LessonPlanController]
})
export class LessonPlanModule {}
