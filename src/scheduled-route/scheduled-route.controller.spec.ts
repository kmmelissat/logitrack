import { Test, TestingModule } from '@nestjs/testing';
import { ScheduledRouteController } from './scheduled-route.controller';
import { ScheduledRouteService } from './scheduled-route.service';

describe('ScheduledRouteController', () => {
  let controller: ScheduledRouteController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [ScheduledRouteController],
      providers: [ScheduledRouteService],
    }).compile();

    controller = module.get<ScheduledRouteController>(ScheduledRouteController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});
