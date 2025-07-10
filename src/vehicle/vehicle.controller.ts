import { Controller, Get, Post, Body, Patch, Param, Delete } from '@nestjs/common';
import { VehicleService } from './vehicle.service';
import { CreateVehicleDto } from './dto/create-vehicle.dto';
import { UpdateVehicleDto } from './dto/update-vehicle.dto';
import { ApiTags, ApiOperation, ApiResponse, ApiParam, ApiBody } from '@nestjs/swagger';

@ApiTags('vehículos')
@Controller('vehicles')
export class VehicleController {
  constructor(private readonly vehicleService: VehicleService) {}

  @Get()
  @ApiOperation({ summary: 'Listar todos los vehículos' })
  @ApiResponse({ status: 200, description: 'Lista de vehículos' })
  findAll() {
    return this.vehicleService.findAll();
  }

  @Get(':id')
  @ApiOperation({ summary: 'Ver detalles de un vehículo' })
  @ApiParam({ name: 'id', type: Number })
  @ApiResponse({ status: 200, description: 'Detalles del vehículo' })
  @ApiResponse({ status: 404, description: 'Vehículo no encontrado' })
  findOne(@Param('id') id: string) {
    return this.vehicleService.findOne(Number(id));
  }

  @Post()
  @ApiOperation({ summary: 'Crear un nuevo vehículo' })
  @ApiBody({ type: CreateVehicleDto })
  @ApiResponse({ status: 201, description: 'Vehículo creado' })
  create(@Body() createVehicleDto: CreateVehicleDto) {
    return this.vehicleService.create(createVehicleDto);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Actualizar datos de un vehículo' })
  @ApiParam({ name: 'id', type: Number })
  @ApiBody({ type: UpdateVehicleDto })
  @ApiResponse({ status: 200, description: 'Vehículo actualizado' })
  @ApiResponse({ status: 404, description: 'Vehículo no encontrado' })
  update(@Param('id') id: string, @Body() updateVehicleDto: UpdateVehicleDto) {
    return this.vehicleService.update(Number(id), updateVehicleDto);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Eliminar o descontinuar un vehículo' })
  @ApiParam({ name: 'id', type: Number })
  @ApiResponse({ status: 200, description: 'Vehículo eliminado' })
  @ApiResponse({ status: 404, description: 'Vehículo no encontrado' })
  remove(@Param('id') id: string) {
    return this.vehicleService.remove(Number(id));
  }
}
