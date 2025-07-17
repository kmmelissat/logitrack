import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { ScheduledRouteService } from './scheduled-route.service';
import { ScheduledRouteController } from './scheduled-route.controller';
import {
  ScheduledRoute,
  ScheduledRouteSchema,
} from './entities/scheduled-route.entity';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: ScheduledRoute.name, schema: ScheduledRouteSchema },
    ]),
  ],
  controllers: [ScheduledRouteController],
  providers: [ScheduledRouteService],
  exports: [ScheduledRouteService],
})
export class ScheduledRouteModule {}
