import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { VehicleCheckinService } from './vehicle-checkin.service';
import { VehicleCheckinController } from './vehicle-checkin.controller';
import {
  VehicleCheckin,
  VehicleCheckinSchema,
} from './entities/vehicle-checkin.entity';
import { Vehicle, VehicleSchema } from '../vehicle/entities/vehicle.entity';
import { User, UserSchema } from '../users/entities/user.entity';
import {
  ScheduledRoute,
  ScheduledRouteSchema,
} from '../scheduled-route/entities/scheduled-route.entity';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: VehicleCheckin.name, schema: VehicleCheckinSchema },
      { name: Vehicle.name, schema: VehicleSchema },
      { name: User.name, schema: UserSchema },
      { name: ScheduledRoute.name, schema: ScheduledRouteSchema },
    ]),
  ],
  controllers: [VehicleCheckinController],
  providers: [VehicleCheckinService],
  exports: [VehicleCheckinService],
})
export class VehicleCheckinModule {}
