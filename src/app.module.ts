import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { MongooseModule } from '@nestjs/mongoose';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { UsersModule } from './users/users.module';
import { AuthModule } from './auth/auth.module';
import { VehicleModule } from './vehicle/vehicle.module';
import { MaintenanceModule } from './maintenance/maintenance.module';
import { GpsEventModule } from './gps-event/gps-event.module';
import { VehicleCheckinModule } from './vehicle-checkin/vehicle-checkin.module';
import { RoutePointModule } from './route-point/route-point.module';
import { ScheduledRouteModule } from './scheduled-route/scheduled-route.module';
import { MapsModule } from './maps/maps.module';

// Note: Mongoose schemas will be registered in their respective modules

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: '.env',
    }),
    MongooseModule.forRootAsync({
      imports: [ConfigModule],
      useFactory: (configService: ConfigService) => ({
        uri: configService.get('MONGODB_URI'),
      }),
      inject: [ConfigService],
    }),
    UsersModule,
    AuthModule,
    VehicleModule,
    MaintenanceModule,
    ScheduledRouteModule,
    RoutePointModule,
    VehicleCheckinModule,
    GpsEventModule,
    MapsModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}