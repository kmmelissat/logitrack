import { IsString, IsNotEmpty, IsEnum, IsDateString, IsNumber, Min, IsOptional, IsMongoId } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';
import { RouteStatus } from '../entities/scheduled-route.entity';
import { Types } from 'mongoose';

export class CreateScheduledRouteDto {
  @ApiProperty({
    description: 'Nombre de la ruta',
    example: 'Ruta San Salvador - Tegucigalpa'
  })
  @IsString()
  @IsNotEmpty()
  name: string;

  @ApiProperty({
    description: 'Descripción de la ruta',
    example: 'Ruta comercial diaria entre capitales',
    required: false
  })
  @IsOptional()
  @IsString()
  description?: string;

  @ApiProperty({
    description: 'Fecha y hora planificada de inicio',
    example: '2025-07-22T06:00:00.000Z'
  })
  @IsDateString()
  plannedStartDate: Date;

  @ApiProperty({
    description: 'Fecha y hora planificada de finalización',
    example: '2025-07-22T18:00:00.000Z'
  })
  @IsDateString()
  plannedEndDate: Date;

  @ApiProperty({
    description: 'Estado inicial de la ruta',
    enum: RouteStatus,
    example: RouteStatus.PLANIFICADA,
    required: false
  })
  @IsOptional()
  @IsEnum(RouteStatus)
  status?: RouteStatus;

  @ApiProperty({
    description: 'Distancia estimada en kilómetros',
    example: 250.5,
    required: false
  })
  @IsOptional()
  @IsNumber()
  @Min(0)
  estimatedDistance?: number;

  @ApiProperty({
    description: 'Punto de origen',
    example: 'Terminal San Salvador',
    required: false
  })
  @IsOptional()
  @IsString()
  origin?: string;

  @ApiProperty({
    description: 'Punto de destino',
    example: 'Terminal Tegucigalpa',
    required: false
  })
  @IsOptional()
  @IsString()
  destination?: string;

  @ApiProperty({
    description: 'Costo estimado en USD',
    example: 1500.00,
    required: false
  })
  @IsOptional()
  @IsNumber()
  @Min(0)
  estimatedCost?: number;

  @ApiProperty({
    description: 'Notas adicionales',
    example: 'Carga frágil - manejo especial',
    required: false
  })
  @IsOptional()
  @IsString()
  notes?: string;

  @ApiProperty({
    description: 'ID del vehículo asignado',
    example: '507f1f77bcf86cd799439011'
  })
  @IsMongoId()
  @IsNotEmpty()
  vehicleId: Types.ObjectId;

  @ApiProperty({
    description: 'ID del conductor asignado',
    example: '507f1f77bcf86cd799439012'
  })
  @IsMongoId()
  @IsNotEmpty()
  driverId: Types.ObjectId;
}