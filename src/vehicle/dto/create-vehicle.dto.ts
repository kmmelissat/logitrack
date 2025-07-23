import { ApiProperty } from '@nestjs/swagger';
import { IsString, IsNumber, IsOptional, IsEnum } from 'class-validator';
import { Type } from 'class-transformer';
import { VehicleStatus } from '../enums/vehicle-status.enum';

export class CreateVehicleDto {
  @ApiProperty({
    description: 'Vehicle plate number',
    example: 'ABC-123',
  })
  @IsString()
  plateNumber: string;

  @ApiProperty({
    description: 'Vehicle brand',
    example: 'Toyota',
  })
  @IsString()
  brand: string;

  @ApiProperty({
    description: 'Vehicle model',
    example: 'Hilux',
  })
  @IsString()
  model: string;

  @ApiProperty({
    description: 'Vehicle year',
    example: 2020,
  })
  @Type(() => Number)
  @IsNumber()
  year: number;

  @ApiProperty({
    description: 'Vehicle VIN',
    required: false,
    example: '1HGBH41JXMN109186',
  })
  @IsOptional()
  @IsString()
  vin?: string;

  @ApiProperty({
    description: 'Vehicle status',
    enum: VehicleStatus,
    default: VehicleStatus.ACTIVO,
    required: false,
  })
  @IsOptional()
  @IsEnum(VehicleStatus)
  status?: VehicleStatus;

  @ApiProperty({
    description: 'Vehicle mileage',
    required: false,
    example: 50000,
  })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  mileage?: number;

  @ApiProperty({
    description: 'Fuel type',
    required: false,
    example: 'Diesel',
  })
  @IsOptional()
  @IsString()
  fuelType?: string;

  @ApiProperty({
    description: 'Vehicle capacity in tons',
    required: false,
    example: 5.5,
  })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  capacity?: number;
}
