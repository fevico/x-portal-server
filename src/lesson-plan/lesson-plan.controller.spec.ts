import { Test, TestingModule } from '@nestjs/testing';
import { LessonPlanController } from './lesson-plan.controller';

describe('LessonPlanController', () => {
  let controller: LessonPlanController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [LessonPlanController],
    }).compile();

    controller = module.get<LessonPlanController>(LessonPlanController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});
