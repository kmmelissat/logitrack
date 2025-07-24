import { ApiProperty } from '@nestjs/swagger';
import { VehicleStatus } from '../enums/vehicle-status.enum';

export class VehicleResponseDto {
  @ApiProperty({
    description: 'Vehicle unique identifier',
    example: '507f1f77bcf86cd799439011',
  })
  _id: string;

  @ApiProperty({
    description: 'Vehicle plate number',
    example: 'ABC-123',
  })
  plateNumber: string;

  @ApiProperty({
    description: 'Vehicle brand',
    example: 'Toyota',
  })
  brand: string;

  @ApiProperty({
    description: 'Vehicle model',
    example: 'Hilux',
  })
  model: string;

  @ApiProperty({
    description: 'Vehicle year',
    example: 2020,
  })
  year: number;

  @ApiProperty({
    description: 'Vehicle VIN',
    required: false,
    example: '1HGBH41JXMN109186',
  })
  vin?: string;

  @ApiProperty({
    description: 'Vehicle status',
    enum: VehicleStatus,
    example: VehicleStatus.ACTIVO,
  })
  status: VehicleStatus;

  @ApiProperty({
    description: 'Vehicle mileage',
    required: false,
    example: 50000,
  })
  mileage?: number;

  @ApiProperty({
    description: 'Fuel type',
    required: false,
    example: 'Diesel',
  })
  fuelType?: string;

  @ApiProperty({
    description: 'Vehicle capacity in tons',
    required: false,
    example: 5.5,
  })
  capacity?: number;

  @ApiProperty({
    description: 'Current vehicle mileage (updated by driver)',
    required: false,
    example: 45000,
  })
  currentMileage?: number;

  @ApiProperty({
    description: 'Current fuel level percentage',
    required: false,
    example: 75,
  })
  fuelLevel?: number;

  @ApiProperty({
    description: 'Driver notes about vehicle condition',
    required: false,
    example: 'Tire pressure warning light on',
  })
  driverNotes?: string;

  @ApiProperty({
    description: 'Assigned driver ID',
    required: false,
    example: '507f1f77bcf86cd799439012',
  })
  assignedDriverId?: string;

  @ApiProperty({
    description: 'Assignment date',
    required: false,
    example: '2024-01-15T08:00:00.000Z',
  })
  assignmentDate?: Date;

  @ApiProperty({
    description: 'Assignment notes',
    required: false,
    example: 'Assigned for route to San Salvador',
  })
  assignmentNotes?: string;

  @ApiProperty({
    description: 'Vehicle creation date',
    example: '2024-01-01T00:00:00.000Z',
  })
  createdAt: Date;

  @ApiProperty({
    description: 'Vehicle last update date',
    example: '2024-01-15T08:00:00.000Z',
  })
  updatedAt: Date;
}
