import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { RoutePointService } from './route-point.service';
import { RoutePointController } from './route-point.controller';
import { RoutePoint, RoutePointSchema } from './entities/route-point.entity';
import {
  ScheduledRoute,
  ScheduledRouteSchema,
} from '../scheduled-route/entities/scheduled-route.entity';
import { MapsModule } from '../maps/maps.module';
import { ScheduledRouteModule } from '../scheduled-route/scheduled-route.module';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: RoutePoint.name, schema: RoutePointSchema },
      { name: ScheduledRoute.name, schema: ScheduledRouteSchema },
    ]),
    MapsModule,
    ScheduledRouteModule,
  ],
  controllers: [RoutePointController],
  providers: [RoutePointService],
  exports: [RoutePointService],
})
export class RoutePointModule {}
