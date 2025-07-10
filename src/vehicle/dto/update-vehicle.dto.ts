import { IsString, IsInt, IsOptional, IsEnum } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';
import { EstadoVehiculo } from '../enums/estado-vehiculo.enum';

export class UpdateVehicleDto {
  @IsOptional()
  @IsString()
  marca?: string;

  @IsOptional()
  @IsString()
  modelo?: string;

  @IsOptional()
  @IsInt()
  año?: number;

  @IsOptional()
  @IsEnum(EstadoVehiculo)
  @ApiPropertyOptional({ enum: EstadoVehiculo })
  estado?: EstadoVehiculo;
} 