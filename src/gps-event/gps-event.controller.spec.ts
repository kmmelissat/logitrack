import { Test, TestingModule } from '@nestjs/testing';
import { GpsEventController } from './gps-event.controller';
import { GpsEventService } from './gps-event.service';

describe('GpsEventController', () => {
  let controller: GpsEventController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [GpsEventController],
      providers: [GpsEventService],
    }).compile();

    controller = module.get<GpsEventController>(GpsEventController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});
