import { ApiProperty } from '@nestjs/swagger';
import { IsOptional, IsNumber, IsString } from 'class-validator';

export class DriverVehicleUpdateDto {
  @ApiProperty({
    description: 'Current vehicle mileage',
    required: false,
    example: 45000,
  })
  @IsOptional()
  @IsNumber()
  currentMileage?: number;

  @ApiProperty({
    description: 'Current fuel level percentage',
    required: false,
    example: 75,
  })
  @IsOptional()
  @IsNumber()
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
