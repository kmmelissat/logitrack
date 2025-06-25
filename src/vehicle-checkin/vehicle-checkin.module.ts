import { Module } from '@nestjs/common';
import { VehicleCheckinService } from './vehicle-checkin.service';
import { VehicleCheckinController } from './vehicle-checkin.controller';

@Module({
  controllers: [VehicleCheckinController],
  providers: [VehicleCheckinService],
})
export class VehicleCheckinModule {}
