import { Module } from '@nestjs/common';
import { ScheduledRouteService } from './scheduled-route.service';
import { ScheduledRouteController } from './scheduled-route.controller';

@Module({
  controllers: [ScheduledRouteController],
  providers: [ScheduledRouteService],
})
export class ScheduledRouteModule {}
