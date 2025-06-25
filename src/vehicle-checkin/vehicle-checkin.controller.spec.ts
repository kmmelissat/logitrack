import { Test, TestingModule } from '@nestjs/testing';
import { VehicleCheckinController } from './vehicle-checkin.controller';
import { VehicleCheckinService } from './vehicle-checkin.service';

describe('VehicleCheckinController', () => {
  let controller: VehicleCheckinController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [VehicleCheckinController],
      providers: [VehicleCheckinService],
    }).compile();

    controller = module.get<VehicleCheckinController>(VehicleCheckinController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});
