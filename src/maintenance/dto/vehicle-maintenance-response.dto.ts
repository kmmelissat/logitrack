import { ApiProperty } from '@nestjs/swagger';
import { Maintenance } from '../entities/maintenance.entity';
import { Vehicle } from '../../vehicle/entities/vehicle.entity';

export class VehicleMaintenanceResponseDto {
  @ApiProperty({
    description: 'List of maintenance records for the vehicle',
    type: [Maintenance],
  })
  maintenance: Maintenance[];

  @ApiProperty({
    description: 'Vehicle information',
    type: Vehicle,
  })
  vehicle: Vehicle;
}
