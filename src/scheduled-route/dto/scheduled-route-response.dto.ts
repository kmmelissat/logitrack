import { ApiProperty } from '@nestjs/swagger';
import { RouteStatus } from '../entities/scheduled-route.entity';
import { PointType } from '../../route-point/entities/route-point.entity';
import { VehicleStatus } from '../../vehicle/enums/vehicle-status.enum';
import { Role } from '../../auth/enums/role.enum';

// DTO para vehículo (con campos reales)
export class VehicleResponseDto {
  @ApiProperty()
  _id: string;

  @ApiProperty()
  plateNumber: string;

  @ApiProperty()
  brand: string;

  @ApiProperty()
  model: string;

  @ApiProperty()
  year: number;

  @ApiProperty()
  vin?: string;

  @ApiProperty({ enum: VehicleStatus })
  status: VehicleStatus;

  @ApiProperty()
  mileage?: number;

  @ApiProperty()
  fuelType?: string;

  @ApiProperty()
  capacity?: number;
}

// DTO para conductor (con campos reales)
export class DriverResponseDto {
  @ApiProperty()
  _id: string;

  @ApiProperty()
  email: string;

  @ApiProperty()
  firstName: string;

  @ApiProperty()
  lastName: string;

  @ApiProperty()
  picture?: string;

  @ApiProperty({ enum: Role })
  role: Role;
}

// DTO para punto de ruta
export class RoutePointResponseDto {
  @ApiProperty()
  _id: string;

  @ApiProperty()
  name: string;

  @ApiProperty()
  description?: string;

  @ApiProperty({ enum: PointType })
  type: PointType;

  @ApiProperty()
  latitude: number;

  @ApiProperty()
  longitude: number;

  @ApiProperty()
  address?: string;

  @ApiProperty()
  sequenceOrder: number;

  @ApiProperty()
  plannedArrivalTime?: Date;

  @ApiProperty()
  actualArrivalTime?: Date;

  @ApiProperty()
  plannedDepartureTime?: Date;

  @ApiProperty()
  actualDepartureTime?: Date;

  @ApiProperty()
  estimatedStayMinutes?: number;

  @ApiProperty()
  radiusMeters?: number;

  @ApiProperty()
  isCompleted: boolean;

  @ApiProperty()
  notes?: string;
}

// DTO principal de respuesta
export class ScheduledRouteResponseDto {
  @ApiProperty()
  _id: string;

  @ApiProperty()
  name: string;

  @ApiProperty()
  description?: string;

  @ApiProperty()
  plannedStartDate: Date;

  @ApiProperty()
  plannedEndDate: Date;

  @ApiProperty()
  actualStartTime?: Date;

  @ApiProperty()
  actualEndTime?: Date;

  @ApiProperty({ enum: RouteStatus })
  status: RouteStatus;

  @ApiProperty()
  estimatedDistance?: number;

  @ApiProperty()
  actualDistance?: number;

  @ApiProperty()
  origin?: string;

  @ApiProperty()
  destination?: string;

  @ApiProperty()
  estimatedCost?: number;

  @ApiProperty()
  notes?: string;

  @ApiProperty({ type: VehicleResponseDto })
  vehicle: VehicleResponseDto;

  @ApiProperty({ type: DriverResponseDto })
  driver: DriverResponseDto;

  @ApiProperty({ type: [RoutePointResponseDto] })
  points: RoutePointResponseDto[];

  @ApiProperty()
  createdAt: Date;

  @ApiProperty()
  updatedAt: Date;
}