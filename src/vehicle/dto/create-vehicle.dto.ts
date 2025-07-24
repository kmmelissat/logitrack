import { ApiProperty } from '@nestjs/swagger';
import {
  IsString,
  IsNumber,
  IsOptional,
  IsEnum,
  Min,
  Max,
  Length,
} from 'class-validator';
import { Type } from 'class-transformer';
import { VehicleStatus } from '../enums/vehicle-status.enum';

export class CreateVehicleDto {
  @ApiProperty({
    description: 'Vehicle plate number',
    example: 'ABC-123',
    minLength: 3,
    maxLength: 20,
  })
  @IsString()
  @Length(3, 20)
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
    minimum: 1900,
    maximum: 2030,
  })
  @Type(() => Number)
  @IsNumber()
  @Min(1900)
  @Max(2030)
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
    minimum: 0,
  })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
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
    minimum: 0,
  })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  capacity?: number;
}
