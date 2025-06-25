import { Test, TestingModule } from '@nestjs/testing';
import { RoutePointService } from './route-point.service';

describe('RoutePointService', () => {
  let service: RoutePointService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [RoutePointService],
    }).compile();

    service = module.get<RoutePointService>(RoutePointService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
