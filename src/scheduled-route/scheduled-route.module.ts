import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { ScheduledRouteService } from './scheduled-route.service';
import { ScheduledRouteController } from './scheduled-route.controller';
import {
  ScheduledRoute,
  ScheduledRouteSchema,
} from './entities/scheduled-route.entity';
import { RoutePoint, RoutePointSchema } from 'src/route-point/entities/route-point.entity';
import { Vehicle, VehicleSchema } from 'src/vehicle/entities/vehicle.entity';
import { User, UserSchema } from 'src/users/entities/user.entity';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: ScheduledRoute.name, schema: ScheduledRouteSchema },
      { name: RoutePoint.name, schema: RoutePointSchema},
      { name: Vehicle.name, schema: VehicleSchema },
      { name: User.name, schema: UserSchema },
    ]),
  ],
  controllers: [ScheduledRouteController],
  providers: [ScheduledRouteService],
  exports: [ScheduledRouteService],
})
export class ScheduledRouteModule {}
