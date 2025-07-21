import { Controller } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { GpsEventService } from './gps-event.service';

@ApiTags('gps-events')
@Controller('gps-events')
export class GpsEventController {
  constructor(private readonly gpsEventService: GpsEventService) {}
}
