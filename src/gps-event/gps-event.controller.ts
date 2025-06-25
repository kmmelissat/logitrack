import { Controller } from '@nestjs/common';
import { GpsEventService } from './gps-event.service';

@Controller('gps-event')
export class GpsEventController {
  constructor(private readonly gpsEventService: GpsEventService) {}
}
