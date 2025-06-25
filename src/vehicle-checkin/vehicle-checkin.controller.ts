import { Controller } from '@nestjs/common';
import { VehicleCheckinService } from './vehicle-checkin.service';

@Controller('vehicle-checkin')
export class VehicleCheckinController {
  constructor(private readonly vehicleCheckinService: VehicleCheckinService) {}
}
