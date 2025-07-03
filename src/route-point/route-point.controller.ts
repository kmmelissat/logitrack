import { Controller } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { RoutePointService } from './route-point.service';

@ApiTags('route-points')
@Controller('route-points')
export class RoutePointController {
  constructor(private readonly routePointService: RoutePointService) {}
}
