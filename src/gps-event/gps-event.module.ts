import { Module } from '@nestjs/common';
import { GpsEventService } from './gps-event.service';
import { GpsEventController } from './gps-event.controller';

@Module({
  controllers: [GpsEventController],
  providers: [GpsEventService],
})
export class GpsEventModule {}
