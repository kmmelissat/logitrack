import { PartialType } from '@nestjs/swagger';
import {
  IsOptional,
  IsString,
  IsEnum,
  IsDateString,
  IsNumber,
  Min,
  IsMongoId,
} from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';
import { RouteStatus } from '../entities/scheduled-route.entity';
import { Types } from 'mongoose';

export class UpdateScheduledRouteDto {
  @ApiProperty({
    description: 'Nombre de la ruta',
    example: 'Ruta San Salvador - Tegucigalpa',
    required: false,
  })
  @IsOptional()
  @IsString()
  name?: string;

  @ApiProperty({
    description: 'Descripción de la ruta',
    example: 'Ruta comercial de carga pesada',
    required: false,
  })
  @IsOptional()
  @IsString()
  description?: string;

  @ApiProperty({
    description: 'Fecha planificada de inicio',
    example: '2025-07-22T08:00:00Z',
    required: false,
  })
  @IsOptional()
  @IsDateString()
  plannedStartDate?: Date;

  @ApiProperty({
    description: 'Fecha planificada de finalización',
    example: '2025-07-22T18:00:00Z',
    required: false,
  })
  @IsOptional()
  @IsDateString()
  plannedEndDate?: Date;

  @ApiProperty({
    description: 'Estado de la ruta',
    enum: RouteStatus,
    example: RouteStatus.EN_PROGRESO,
    required: false,
  })
  @IsOptional()
  @IsEnum(RouteStatus)
  status?: RouteStatus;

  @ApiProperty({
    description: 'Distancia estimada en kilómetros',
    example: 450.5,
    required: false,
  })
  @IsOptional()
  @IsNumber()
  @Min(0)
  estimatedDistance?: number;

  @ApiProperty({
    description: 'Origen de la ruta',
    example: 'San Salvador, El Salvador',
    required: false,
  })
  @IsOptional()
  @IsString()
  origin?: string;

  @ApiProperty({
    description: 'Destino de la ruta',
    example: 'Tegucigalpa, Honduras',
    required: false,
  })
  @IsOptional()
  @IsString()
  destination?: string;

  @ApiProperty({
    description: 'Costo estimado en USD',
    example: 1200.0,
    required: false,
  })
  @IsOptional()
  @IsNumber()
  @Min(0)
  estimatedCost?: number;

  @ApiProperty({
    description: 'Notas adicionales',
    example: 'Carga frágil, manejar con cuidado',
    required: false,
  })
  @IsOptional()
  @IsString()
  notes?: string;

  @ApiProperty({
    description: 'ID del vehículo asignado',
    example: '507f1f77bcf86cd799439011',
    required: false,
  })
  @IsOptional()
  @IsMongoId()
  vehicleId?: Types.ObjectId;

  @ApiProperty({
    description: 'ID del conductor asignado',
    example: '507f1f77bcf86cd799439012',
    required: false,
  })
  @IsOptional()
  @IsMongoId()
  driverId?: Types.ObjectId;
}
