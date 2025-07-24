import { ApiProperty } from '@nestjs/swagger';
import { IsOptional, IsNumber, IsString, Min, Max } from 'class-validator';

export class DriverVehicleUpdateDto {
  @ApiProperty({
    description: 'Current vehicle mileage',
    required: false,
    example: 45000,
    minimum: 0,
  })
  @IsOptional()
  @IsNumber()
  @Min(0)
  currentMileage?: number;

  @ApiProperty({
    description: 'Current fuel level percentage',
    required: false,
    example: 75,
    minimum: 0,
    maximum: 100,
  })
  @IsOptional()
  @IsNumber()
  @Min(0)
  @Max(100)
  fuelLevel?: number;

  @ApiProperty({
    description: 'Driver notes about vehicle condition',
    required: false,
    example: 'Tire pressure warning light on',
  })
  @IsOptional()
  @IsString()
  driverNotes?: string;
}
