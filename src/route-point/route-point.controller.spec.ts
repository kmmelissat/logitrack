import { Test, TestingModule } from '@nestjs/testing';
import { RoutePointController } from './route-point.controller';
import { RoutePointService } from './route-point.service';

describe('RoutePointController', () => {
  let controller: RoutePointController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [RoutePointController],
      providers: [RoutePointService],
    }).compile();

    controller = module.get<RoutePointController>(RoutePointController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});
