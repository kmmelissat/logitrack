import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
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

// Entidades
import { User } from './users/entities/user.entity';
import { Vehicle } from './vehicle/entities/vehicle.entity';
import { Maintenance } from './maintenance/entities/maintenance.entity';
import { ScheduledRoute } from './scheduled-route/entities/scheduled-route.entity';
import { RoutePoint } from './route-point/entities/route-point.entity';
import { VehicleCheckin } from './vehicle-checkin/entities/vehicle-checkin.entity';
import { GpsEvent } from './gps-event/entities/gps-event.entity';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: '.env',
    }),
    TypeOrmModule.forRootAsync({
      imports: [ConfigModule],
      useFactory: (configService: ConfigService) => ({
        type: 'postgres',
        host: configService.get('DB_HOST') || 'localhost',
        port: configService.get('DB_PORT') || 5432,
        username: configService.get('DB_USERNAME') || 'postgres',
        password: configService.get('DB_PASSWORD') || 'postgres',
        database: configService.get('DB_NAME') || 'logitrack',
        entities: [
          User,
          Vehicle,
          Maintenance,
          ScheduledRoute,
          RoutePoint,
          VehicleCheckin,
          GpsEvent,
        ],
        synchronize: configService.get('NODE_ENV') !== 'production',
        logging: configService.get('NODE_ENV') === 'development',
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
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
