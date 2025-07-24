import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { MaintenanceService } from './maintenance.service';
import { MaintenanceController } from './maintenance.controller';
import { Maintenance, MaintenanceSchema } from './entities/maintenance.entity';
import { Vehicle, VehicleSchema } from '../vehicle/entities/vehicle.entity';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: Maintenance.name, schema: MaintenanceSchema },
      { name: Vehicle.name, schema: VehicleSchema },
    ]),
  ],
  controllers: [MaintenanceController],
  providers: [MaintenanceService],
  exports: [MaintenanceService],
})
export class MaintenanceModule {}
