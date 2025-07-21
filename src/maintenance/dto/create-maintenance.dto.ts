import { ApiProperty } from '@nestjs/swagger';
import {
  IsString,
  IsNumber,
  IsOptional,
  IsBoolean,
  IsDateString,
} from 'class-validator';

export class CreateMaintenanceDto {
  @ApiProperty({
    description: 'Maintenance type',
    example: 'Cambio de aceite',
  })
  @IsString()
  type: string;

  @ApiProperty({
    description: 'Maintenance description',
    example: 'Cambio de aceite y filtros',
  })
  @IsString()
  description: string;

  @ApiProperty({
    description: 'Maintenance date',
    example: '2024-01-15',
  })
  @IsDateString()
  maintenanceDate: string;

  @ApiProperty({
    description: 'Maintenance cost',
    example: 150.5,
  })
  @IsNumber()
  cost: number;

  @ApiProperty({
    description: 'Service provider',
    required: false,
    example: 'Taller Central',
  })
  @IsOptional()
  @IsString()
  provider?: string;

  @ApiProperty({
    description: 'Vehicle mileage at maintenance',
    required: false,
    example: 45000,
  })
  @IsOptional()
  @IsNumber()
  mileageAtMaintenance?: number;

  @ApiProperty({
    description: 'Next maintenance date',
    required: false,
    example: '2024-07-15',
  })
  @IsOptional()
  @IsDateString()
  nextMaintenanceDate?: string;

  @ApiProperty({
    description: 'Next maintenance mileage',
    required: false,
    example: 50000,
  })
  @IsOptional()
  @IsNumber()
  nextMaintenanceMileage?: number;

  @ApiProperty({
    description: 'Is maintenance completed',
    default: true,
  })
  @IsOptional()
  @IsBoolean()
  isCompleted?: boolean;

  @ApiProperty({
    description: 'Vehicle ID',
    example: '507f1f77bcf86cd799439011',
  })
  @IsString()
  vehicleId: string;
}
