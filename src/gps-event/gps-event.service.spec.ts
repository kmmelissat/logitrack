import { Test, TestingModule } from '@nestjs/testing';
import { GpsEventService } from './gps-event.service';

describe('GpsEventService', () => {
  let service: GpsEventService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [GpsEventService],
    }).compile();

    service = module.get<GpsEventService>(GpsEventService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
