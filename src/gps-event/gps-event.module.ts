import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { GpsEventService } from './gps-event.service';
import { GpsEventController } from './gps-event.controller';
import { GpsSimulatorService } from './gps-simulator.service';
import { GpsMonitoringController } from './gps-monitoring.controller';
import { GpsEvent, GpsEventSchema } from './entities/gps-event.entity';
import {
  RoutePoint,
  RoutePointSchema,
} from '../route-point/entities/route-point.entity';
import {
  ScheduledRoute,
  ScheduledRouteSchema,
} from '../scheduled-route/entities/scheduled-route.entity';
import { Vehicle, VehicleSchema } from '../vehicle/entities/vehicle.entity';
import { User, UserSchema } from '../users/entities/user.entity';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: GpsEvent.name, schema: GpsEventSchema },
      { name: RoutePoint.name, schema: RoutePointSchema },
      { name: ScheduledRoute.name, schema: ScheduledRouteSchema },
      { name: Vehicle.name, schema: VehicleSchema },
      { name: User.name, schema: UserSchema },
    ]),
  ],
  controllers: [GpsEventController, GpsMonitoringController],
  providers: [GpsEventService, GpsSimulatorService],
  exports: [GpsEventService, GpsSimulatorService],
})
export class GpsEventModule {}
