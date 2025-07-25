import { ApiProperty } from '@nestjs/swagger';
import { Maintenance } from '../entities/maintenance.entity';
import { Vehicle } from '../../vehicle/entities/vehicle.entity';

export class CreateMaintenanceResponseDto {
  @ApiProperty({
    description: 'Created maintenance record',
    type: Maintenance,
  })
  maintenance: Maintenance;

  @ApiProperty({
    description: 'Vehicle information',
    type: Vehicle,
  })
  vehicle: Vehicle;
}
