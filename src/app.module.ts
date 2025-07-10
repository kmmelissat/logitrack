import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { UsersModule } from './users/users.module';
import { AuthModule } from './auth/auth.module';
import { VehicleModule } from './vehicle/vehicle.module';
import { MaintenanceModule } from './maintenance/maintenance.module';
import { MapsModule } from './maps/maps.module';
import { GpsEventModule } from './gps-event/gps-event.module';
import { VehicleCheckinModule } from './vehicle-checkin/vehicle-checkin.module';
import { RoutePointModule } from './route-point/route-point.module';
import { ScheduledRouteModule } from './scheduled-route/scheduled-route.module';
import { ConfigModule } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
    }),
    TypeOrmModule.forRoot({
      type: 'postgres',
      host: process.env.DB_HOST || 'localhost',
      port: parseInt(process.env.DB_PORT || '5432', 10),
      username: process.env.DB_USERNAME || 'postgres',
      password: process.env.DB_PASSWORD || 'suser',
      database: process.env.DB_NAME || 'logitrack',
      autoLoadEntities: true,
      synchronize: true, // Solo para desarrollo
    }),
    UsersModule,
    AuthModule,
    VehicleModule,
    MaintenanceModule,
    ScheduledRouteModule,
    RoutePointModule,
    VehicleCheckinModule,
    GpsEventModule,
    MapsModule
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
