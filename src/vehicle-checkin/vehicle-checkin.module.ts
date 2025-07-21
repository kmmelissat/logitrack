import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { VehicleCheckinService } from './vehicle-checkin.service';
import { VehicleCheckinController } from './vehicle-checkin.controller';
import {
  VehicleCheckin,
  VehicleCheckinSchema,
} from './entities/vehicle-checkin.entity';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: VehicleCheckin.name, schema: VehicleCheckinSchema },
    ]),
  ],
  controllers: [VehicleCheckinController],
  providers: [VehicleCheckinService],
  exports: [VehicleCheckinService],
})
export class VehicleCheckinModule {}
