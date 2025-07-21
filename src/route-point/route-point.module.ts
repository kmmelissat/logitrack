import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { RoutePointService } from './route-point.service';
import { RoutePointController } from './route-point.controller';
import { RoutePoint, RoutePointSchema } from './entities/route-point.entity';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: RoutePoint.name, schema: RoutePointSchema },
    ]),
  ],
  controllers: [RoutePointController],
  providers: [RoutePointService],
  exports: [RoutePointService],
})
export class RoutePointModule {}
