import { Test, TestingModule } from '@nestjs/testing';
import { SubRolesService } from './sub-roles.service';

describe('SubRolesService', () => {
  let service: SubRolesService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [SubRolesService],
    }).compile();

    service = module.get<SubRolesService>(SubRolesService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
