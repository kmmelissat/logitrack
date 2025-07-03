import { Controller } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { ScheduledRouteService } from './scheduled-route.service';

@ApiTags('scheduled-routes')
@Controller('scheduled-routes')
export class ScheduledRouteController {
  constructor(private readonly scheduledRouteService: ScheduledRouteService) {}
}
