import { Test, TestingModule } from '@nestjs/testing';
import { ScheduledRouteService } from './scheduled-route.service';

describe('ScheduledRouteService', () => {
  let service: ScheduledRouteService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [ScheduledRouteService],
    }).compile();

    service = module.get<ScheduledRouteService>(ScheduledRouteService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
