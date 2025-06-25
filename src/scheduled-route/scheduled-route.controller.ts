import { Controller } from '@nestjs/common';
import { ScheduledRouteService } from './scheduled-route.service';

@Controller('scheduled-route')
export class ScheduledRouteController {
  constructor(private readonly scheduledRouteService: ScheduledRouteService) {}
}
