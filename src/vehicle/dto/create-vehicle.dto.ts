import { IsString, IsInt, IsOptional, IsEnum } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';
import { EstadoVehiculo } from '../enums/estado-vehiculo.enum';

export class CreateVehicleDto {
  @IsString()
  marca: string;

  @IsString()
  modelo: string;

  @IsInt()
  año: number;

  @IsOptional()
  @IsEnum(EstadoVehiculo)
  @ApiProperty({ enum: EstadoVehiculo, default: EstadoVehiculo.ACTIVO })
  estado?: EstadoVehiculo;
} 