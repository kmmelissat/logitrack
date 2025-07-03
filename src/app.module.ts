import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { UsersModule } from './users/users.module';
import { AuthModule } from './auth/auth.module';
import { VehiclesModule } from './vehicles/vehicles.module';
import { MaintenanceModule } from './maintenance/maintenance.module';
import { MapsModule } from './maps/maps.module';
import { GpsEventModule } from './gps-event/gps-event.module';
import { VehicleCheckinModule } from './vehicle-checkin/vehicle-checkin.module';
import { RoutePointModule } from './route-point/route-point.module';
import { ScheduledRouteModule } from './scheduled-route/scheduled-route.module';
import { UserModule } from './user/user.module';
import { VehicleModule } from './vehicle/vehicle.module';
import { MaintenanceModule } from './maintenance/maintenance.module';

@Module({
  imports: [UsersModule, AuthModule, VehiclesModule, MaintenanceModule, UserModule, VehicleModule, ScheduledRouteModule, RoutePointModule, VehicleCheckinModule, GpsEventModule, MapsModule],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
