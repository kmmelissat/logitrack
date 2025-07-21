import { Controller } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { VehicleCheckinService } from './vehicle-checkin.service';

@ApiTags('vehicle-checkins')
@Controller('vehicle-checkins')
export class VehicleCheckinController {
  constructor(private readonly vehicleCheckinService: VehicleCheckinService) {}
}
