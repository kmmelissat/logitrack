import { Module } from '@nestjs/common';
import { RoutePointService } from './route-point.service';
import { RoutePointController } from './route-point.controller';

@Module({
  controllers: [RoutePointController],
  providers: [RoutePointService],
})
export class RoutePointModule {}
