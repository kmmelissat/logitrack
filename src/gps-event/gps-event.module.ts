import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { GpsEventService } from './gps-event.service';
import { GpsEventController } from './gps-event.controller';
import { GpsEvent, GpsEventSchema } from './entities/gps-event.entity';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: GpsEvent.name, schema: GpsEventSchema },
    ]),
  ],
  controllers: [GpsEventController],
  providers: [GpsEventService],
  exports: [GpsEventService],
})
export class GpsEventModule {}
