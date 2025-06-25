import { Controller } from '@nestjs/common';
import { RoutePointService } from './route-point.service';

@Controller('route-point')
export class RoutePointController {
  constructor(private readonly routePointService: RoutePointService) {}
}
