import { 
  Body, 
  Controller, 
  Get, 
  HttpException, 
  HttpStatus, 
  Param,
  Patch, 
  UseGuards 
} from '@nestjs/common';

import { 
  ApiBearerAuth, 
  ApiBody, 
  ApiOperation, 
  ApiParam, 
  ApiResponse, 
  ApiTags 
} from '@nestjs/swagger';
import { ScheduledRouteService } from './scheduled-route.service';
import { JwtAuthGuard } from 'src/auth/guards/jwt-auth.guard';
import { RolesGuard } from 'src/auth/guards/roles.guard';
import { Roles } from 'src/auth/decorators/roles.decorator';
import { Role } from 'src/auth/enums/role.enum';
import { ScheduledRouteResponseDto } from './dto/scheduled-route-response.dto';
import { UpdateScheduledRouteDto } from './dto/update-scheduled-route.dto';

@ApiTags('scheduled-routes')
@Controller('scheduled-routes')
@UseGuards(JwtAuthGuard, RolesGuard)
@ApiBearerAuth()
export class ScheduledRouteController {
  constructor(private readonly scheduledRouteService: ScheduledRouteService) {}

  @Get(':id')
  @ApiOperation({
    summary: 'Obtener detalles de ruta programada',
    description: 'Retorna los detalles completos de una ruta incluyendo vehículo, conductor y puntos de ruta ordenados por secuencia'
  })
  @ApiParam({
    name: 'id',
    description: 'ID único de la ruta programada',
    example: '507f1f77bcf86cd799439011'
  })
  @ApiResponse({
    status: 200,
    description: 'Detalles de la ruta obtenidos exitosamente',
    type: ScheduledRouteResponseDto
  })
  @ApiResponse({
    status: 400,
    description: 'ID de ruta inválido'
  })
  @ApiResponse({
    status: 404,
    description: 'Ruta no encontrada'
  })
  @ApiResponse({
    status: 401,
    description: 'No autorizado - Token requerido'
  })
  @Roles(Role.ADMIN, Role.LOGISTICA, Role.CONDUCTOR)
  async findOne(@Param('id') id: string): Promise<ScheduledRouteResponseDto>{
    try{
      const route = await this.scheduledRouteService.findOneWithDetails(id);
      return await this.scheduledRouteService.formatRouteResponse(route);
    } catch (error) {
      if (error instanceof HttpException) {
        throw error;;
      }

      throw new HttpException(
        'Error interno del servidor al obtener ruta',
        HttpStatus.INTERNAL_SERVER_ERROR
      );
    }
  }

  @Patch(';id')
  @ApiOperation({ 
    summary: 'Actualizar ruta programada',
    description: 'Actualiza parcialmente los datos de una ruta programada. Solo se modificarán los campos enviados en el request.'
  })
  @ApiParam({
    name: 'id',
    description: 'ID único de la ruta programada a actualizar',
    example: '507f1f77bcf86cd799439011'
  })
  @ApiBody({
    type: UpdateScheduledRouteDto,
    description: 'Campos a actualizar en la ruta',
    examples: {
      'Cambiar estado': {
        value: {
          status: 'en_progreso',
          notes: 'Ruta iniciada según programación'
        }
      },
      'Actualizar fechas': {
        value: {
          plannedStartDate: '2025-07-23T08:00:00Z',
          plannedEndDate: '2025-07-23T18:00:00Z'
        }
      },
      'Modificar costos': {
        value: {
          estimatedCost: 1500.00,
          estimatedDistance: 480.5
        }
      }
    }
  })
  @ApiResponse({
    status: 200,
    description: 'Ruta actualizada exitosamente',
    type: ScheduledRouteResponseDto
  })
  @ApiResponse({
    status: 400,
    description: 'Datos inválidos o ID de ruta inválido'
  })
  @ApiResponse({
    status: 404,
    description: 'Ruta no encontrada'
  })
  @ApiResponse({
    status: 401,
    description: 'No autorizado - Token requerido'
  })
  @ApiResponse({
    status: 403,
    description: 'Prohibido - Rol insuficiente'
  })
  @Roles(Role.ADMIN, Role.LOGISTICA)
  async update(
    @Param(':id') id:string,
    @Body() updateScheduledRouteDto: UpdateScheduledRouteDto
  ): Promise<ScheduledRouteResponseDto> {
    try{
      const updatedRoute = await this.scheduledRouteService.update(id, updateScheduledRouteDto);
      return await this.scheduledRouteService.formatRouteResponse(updatedRoute);
    } catch (error) {
      if (error instanceof HttpException){
        throw error;
      }

      throw new HttpException(
        'Error interno del servidor al actualizar la ruta',
        HttpStatus.INTERNAL_SERVER_ERROR
      );
    }
  }
}
