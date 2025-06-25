import { Test, TestingModule } from '@nestjs/testing';
import { VehicleCheckinService } from './vehicle-checkin.service';

describe('VehicleCheckinService', () => {
  let service: VehicleCheckinService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [VehicleCheckinService],
    }).compile();

    service = module.get<VehicleCheckinService>(VehicleCheckinService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
