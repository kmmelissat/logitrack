import {
  Body,
  Controller,
  Get,
  HttpException,
  HttpStatus,
  Param,
  Patch,
  Post,
  UseGuards,
  Query,
  Delete,
  BadRequestException,
  NotFoundException,
} from '@nestjs/common';

import {
  ApiBearerAuth,
  ApiBody,
  ApiOperation,
  ApiParam,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';
import { ScheduledRouteService } from './scheduled-route.service';
import { JwtAuthGuard } from 'src/auth/guards/jwt-auth.guard';
import { RolesGuard } from 'src/auth/guards/roles.guard';
import { Roles } from 'src/auth/decorators/roles.decorator';
import { Role } from 'src/auth/enums/role.enum';
import { ScheduledRouteResponseDto } from './dto/scheduled-route-response.dto';
import { UpdateScheduledRouteDto } from './dto/update-scheduled-route.dto';

import { CreateScheduledRouteDto } from './dto/create-scheduled-route.dto';
import {
  ListScheduledRoutesDto,
  ListScheduledRoutesResponseDto,
} from './dto/list-scheduled-route.dto';

@ApiTags('scheduled-routes')
@Controller('scheduled-routes')
@UseGuards(JwtAuthGuard, RolesGuard)
@ApiBearerAuth()
export class ScheduledRouteController {
  constructor(private readonly scheduledRouteService: ScheduledRouteService) {}

  @Get()
  @Roles(Role.ADMIN, Role.LOGISTICA, Role.CONDUCTOR)
  @ApiOperation({
    summary: 'Listar rutas programadas',
    description:
      'Obtiene una lista paginada de rutas programadas con filtros opcionales',
  })
  @ApiResponse({
    status: 200,
    description: 'Lista de rutas obtenida exitosamente',
    type: ListScheduledRoutesResponseDto,
  })
  @ApiResponse({
    status: 400,
    description: 'Parámetros de consulta inválidos',
  })
  async findAll(
    @Query() queryDto: ListScheduledRoutesDto,
  ): Promise<ListScheduledRoutesResponseDto> {
    try {
      return await this.scheduledRouteService.findAll(queryDto);
    } catch (error) {
      if (error instanceof BadRequestException) {
        throw error;
      }
      throw new HttpException(
        'Error interno del servidor',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  @Get('available-vehicles')
  @Roles(Role.ADMIN, Role.LOGISTICA)
  @ApiOperation({
    summary: 'Obtener vehículos disponibles con conductores asignados',
    description:
      'Obtiene todos los vehículos activos que tienen conductores asignados',
  })
  @ApiResponse({
    status: 200,
    description: 'Lista de vehículos disponibles obtenida exitosamente',
  })
  async getAvailableVehicles() {
    try {
      return await this.scheduledRouteService.getAvailableVehiclesWithDrivers();
    } catch (error) {
      throw new HttpException(
        'Error interno del servidor',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  @Get('available-drivers')
  @Roles(Role.ADMIN, Role.LOGISTICA)
  @ApiOperation({
    summary: 'Obtener conductores disponibles con vehículos asignados',
    description: 'Obtiene todos los conductores que tienen vehículos asignados',
  })
  @ApiResponse({
    status: 200,
    description: 'Lista de conductores disponibles obtenida exitosamente',
  })
  async getAvailableDrivers() {
    try {
      return await this.scheduledRouteService.getAvailableDriversWithVehicles();
    } catch (error) {
      throw new HttpException(
        'Error interno del servidor',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  @Post()
  @Roles(Role.ADMIN, Role.LOGISTICA)
  @ApiOperation({
    summary: 'Crear nueva ruta programada',
    description: 'Crea una nueva ruta programada con validaciones de negocio',
  })
  @ApiBody({
    type: CreateScheduledRouteDto,
    description: 'Datos de la nueva ruta',
    examples: {
      ejemplo1: {
        summary: 'Ruta básica',
        value: {
          name: 'Ruta San Salvador - Tegucigalpa',
          description: 'Ruta comercial diaria',
          plannedStartDate: '2025-07-22T06:00:00.000Z',
          plannedEndDate: '2025-07-22T18:00:00.000Z',
          origin: 'Terminal San Salvador',
          destination: 'Terminal Tegucigalpa',
          estimatedDistance: 250.5,
          estimatedCost: 1500.0,
          vehicleId: '507f1f77bcf86cd799439011',
          driverId: '507f1f77bcf86cd799439012',
        },
      },
    },
  })
  @ApiResponse({
    status: 201,
    description: 'Ruta creada exitosamente',
    type: ScheduledRouteResponseDto,
  })
  @ApiResponse({
    status: 400,
    description: 'Datos inválidos o conflicto de programación',
  })
  @ApiResponse({
    status: 404,
    description: 'Vehículo o conductor no encontrado',
  })
  async create(
    @Body() createDto: CreateScheduledRouteDto,
  ): Promise<ScheduledRouteResponseDto> {
    try {
      const createdRoute = await this.scheduledRouteService.create(createDto);
      // Fetch the full document to ensure it is a ScheduledRouteDocument
      const routeDocument = await this.scheduledRouteService.findOneWithDetails(
        createdRoute._id.toString(),
      );
      return await this.scheduledRouteService.formatRouteResponse(
        routeDocument,
      );
    } catch (error) {
      if (error instanceof NotFoundException) {
        throw error;
      }
      if (error instanceof BadRequestException) {
        throw error;
      }
      throw new HttpException(
        'Error interno del servidor',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  @Delete(':id')
  @Roles(Role.ADMIN)
  @ApiOperation({
    summary: 'Eliminar ruta programada',
    description:
      'Elimina una ruta programada y sus puntos asociados. Solo rutas planificadas o canceladas pueden ser eliminadas.',
  })
  @ApiParam({
    name: 'id',
    description: 'ID único de la ruta',
    example: '507f1f77bcf86cd799439011',
  })
  @ApiResponse({
    status: 200,
    description: 'Ruta eliminada exitosamente',
    schema: {
      example: {
        message: 'Ruta eliminada exitosamente',
      },
    },
  })
  @ApiResponse({
    status: 400,
    description: 'ID inválido o ruta no se puede eliminar',
  })
  @ApiResponse({
    status: 404,
    description: 'Ruta no encontrada',
  })
  async remove(@Param('id') id: string): Promise<{ message: string }> {
    try {
      return await this.scheduledRouteService.remove(id);
    } catch (error) {
      if (
        error instanceof NotFoundException ||
        error instanceof BadRequestException
      ) {
        throw error;
      }
      throw new HttpException(
        'Error interno del servidor',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  @Get(':id')
  @ApiOperation({
    summary: 'Obtener detalles de ruta programada',
    description:
      'Retorna los detalles completos de una ruta incluyendo vehículo, conductor y puntos de ruta ordenados por secuencia',
  })
  @ApiParam({
    name: 'id',
    description: 'ID único de la ruta programada',
    example: '507f1f77bcf86cd799439011',
  })
  @ApiResponse({
    status: 200,
    description: 'Detalles de la ruta obtenidos exitosamente',
    type: ScheduledRouteResponseDto,
  })
  @ApiResponse({
    status: 400,
    description: 'ID de ruta inválido',
  })
  @ApiResponse({
    status: 404,
    description: 'Ruta no encontrada',
  })
  @ApiResponse({
    status: 401,
    description: 'No autorizado - Token requerido',
  })
  @Roles(Role.ADMIN, Role.LOGISTICA, Role.CONDUCTOR)
  async findOne(@Param('id') id: string): Promise<ScheduledRouteResponseDto> {
    try {
      const route = await this.scheduledRouteService.findOneWithDetails(id);
      return await this.scheduledRouteService.formatRouteResponse(route);
    } catch (error) {
      if (error instanceof HttpException) {
        throw error;
      }

      throw new HttpException(
        'Error interno del servidor al obtener ruta',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  @Patch(':id')
  @ApiOperation({
    summary: 'Actualizar ruta programada',
    description:
      'Actualiza parcialmente los datos de una ruta programada. Solo se modificarán los campos enviados en el request.',
  })
  @ApiParam({
    name: 'id',
    description: 'ID único de la ruta programada a actualizar',
    example: '507f1f77bcf86cd799439011',
  })
  @ApiBody({
    type: UpdateScheduledRouteDto,
    description: 'Campos a actualizar en la ruta',
    examples: {
      'Cambiar estado': {
        value: {
          status: 'en_progreso',
          notes: 'Ruta iniciada según programación',
        },
      },
      'Actualizar fechas': {
        value: {
          plannedStartDate: '2025-07-23T08:00:00Z',
          plannedEndDate: '2025-07-23T18:00:00Z',
        },
      },
      'Modificar costos': {
        value: {
          estimatedCost: 1500.0,
          estimatedDistance: 480.5,
        },
      },
    },
  })
  @ApiResponse({
    status: 200,
    description: 'Ruta actualizada exitosamente',
    type: ScheduledRouteResponseDto,
  })
  @ApiResponse({
    status: 400,
    description: 'Datos inválidos o ID de ruta inválido',
  })
  @ApiResponse({
    status: 404,
    description: 'Ruta no encontrada',
  })
  @ApiResponse({
    status: 401,
    description: 'No autorizado - Token requerido',
  })
  @ApiResponse({
    status: 403,
    description: 'Prohibido - Rol insuficiente',
  })
  @Roles(Role.ADMIN, Role.LOGISTICA)
  async update(
    @Param('id') id: string,
    @Body() updateScheduledRouteDto: UpdateScheduledRouteDto,
  ): Promise<ScheduledRouteResponseDto> {
    try {
      const updatedRoute = await this.scheduledRouteService.update(
        id,
        updateScheduledRouteDto,
      );
      return await this.scheduledRouteService.formatRouteResponse(updatedRoute);
    } catch (error) {
      if (error instanceof HttpException) {
        throw error;
      }

      throw new HttpException(
        'Error interno del servidor al actualizar la ruta',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  @Get(':id/calculate-route')
  @Roles(Role.ADMIN, Role.LOGISTICA)
  @ApiOperation({
    summary: 'Calculate Google Maps route for scheduled route',
    description:
      'Calculates the complete driving route using Google Maps Directions API',
  })
  @ApiResponse({
    status: 200,
    description:
      'Route calculated successfully with polyline and turn-by-turn directions',
    schema: {
      type: 'object',
      properties: {
        _id: { type: 'string' },
        name: { type: 'string' },
        routePolyline: {
          type: 'string',
          description: 'Encoded polyline from Google Maps',
        },
        decodedPath: {
          type: 'array',
          items: {
            type: 'object',
            properties: {
              lat: { type: 'number' },
              lng: { type: 'number' },
            },
          },
          description: 'Array of coordinates for the complete route',
        },
        estimatedDistance: {
          type: 'number',
          description: 'Distance in meters',
        },
        estimatedDistanceText: {
          type: 'string',
          description: 'Human readable distance',
        },
        estimatedDuration: {
          type: 'number',
          description: 'Duration in seconds',
        },
        estimatedDurationText: {
          type: 'string',
          description: 'Human readable duration',
        },
        routeSteps: {
          type: 'array',
          items: {
            type: 'object',
            properties: {
              instruction: { type: 'string' },
              distance: { type: 'string' },
              duration: { type: 'string' },
              startLocation: { type: 'object' },
              endLocation: { type: 'object' },
            },
          },
          description: 'Turn-by-turn directions',
        },
        waypoints: { type: 'array', items: { type: 'string' } },
        lastRouteCalculation: { type: 'string', format: 'date-time' },
      },
    },
  })
  @ApiResponse({
    status: 400,
    description: 'Route must have at least origin and destination points',
  })
  @ApiResponse({
    status: 404,
    description: 'Route not found',
  })
  async calculateRoute(@Param('id') id: string): Promise<any> {
    try {
      const route =
        await this.scheduledRouteService.calculateAndUpdateRoute(id);
      return this.scheduledRouteService.formatRouteResponse(route as any);
    } catch (error) {
      if (
        error instanceof BadRequestException ||
        error instanceof NotFoundException
      ) {
        throw error;
      }
      throw new HttpException(
        'Error interno del servidor',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  @Get(':id/complete-path')
  @Roles(Role.ADMIN, Role.LOGISTICA, Role.CONDUCTOR)
  @ApiOperation({
    summary: 'Get route with complete Google Maps path',
    description:
      'Returns the route with the complete driving path from Google Maps',
  })
  @ApiResponse({
    status: 200,
    description: 'Route with complete path data',
    schema: {
      type: 'object',
      properties: {
        _id: { type: 'string' },
        name: { type: 'string' },
        routePolyline: { type: 'string' },
        decodedPath: { type: 'array' },
        estimatedDistance: { type: 'number' },
        estimatedDuration: { type: 'number' },
        routeSteps: { type: 'array' },
        points: { type: 'array' },
        vehicle: { type: 'object' },
        driver: { type: 'object' },
      },
    },
  })
  @ApiResponse({
    status: 404,
    description: 'Route not found',
  })
  async getRouteWithCompletePath(@Param('id') id: string): Promise<any> {
    try {
      const route =
        await this.scheduledRouteService.getRouteWithCompletePath(id);
      return this.scheduledRouteService.formatRouteResponse(route);
    } catch (error) {
      if (
        error instanceof BadRequestException ||
        error instanceof NotFoundException
      ) {
        throw error;
      }
      throw new HttpException(
        'Error interno del servidor',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }
}
