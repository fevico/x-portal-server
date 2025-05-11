import { Test, TestingModule } from '@nestjs/testing';
import { SubRolesController } from './sub-roles.controller';

describe('SubRolesController', () => {
  let controller: SubRolesController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [SubRolesController],
    }).compile();

    controller = module.get<SubRolesController>(SubRolesController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});
