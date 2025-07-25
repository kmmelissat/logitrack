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
  ApiQuery,
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

  @Get('check-raw-data/:id')
  @Roles(Role.ADMIN, Role.LOGISTICA)
  @ApiOperation({
    summary: 'Check raw MongoDB data for a route',
    description:
      'Check the raw MongoDB document to see exactly what data is stored',
  })
  @ApiParam({
    name: 'id',
    description: 'ID of the scheduled route to check',
    example: '688301b79937840965cb810e',
  })
  @ApiResponse({
    status: 200,
    description: 'Raw MongoDB data',
  })
  async checkRawData(@Param('id') id: string): Promise<any> {
    try {
      console.log(`=== Checking Raw MongoDB Data for Route ID: ${id} ===`);

      // Get the raw MongoDB document without any processing
      const rawDocument = await this.scheduledRouteService[
        'scheduledRouteModel'
      ]
        .findById(id)
        .lean()
        .exec();

      if (!rawDocument) {
        return {
          success: false,
          message: 'Route not found',
          rawData: null,
        };
      }

      console.log('Raw MongoDB document:');
      console.log(JSON.stringify(rawDocument, null, 2));

      // Check specific fields
      const googleMapsFields = {
        routePolyline: {
          exists: !!rawDocument.routePolyline,
          type: typeof rawDocument.routePolyline,
          length: rawDocument.routePolyline
            ? rawDocument.routePolyline.length
            : 0,
          value: rawDocument.routePolyline
            ? rawDocument.routePolyline.substring(0, 50) + '...'
            : null,
        },
        decodedPath: {
          exists: !!rawDocument.decodedPath,
          type: typeof rawDocument.decodedPath,
          isArray: Array.isArray(rawDocument.decodedPath),
          length: Array.isArray(rawDocument.decodedPath)
            ? rawDocument.decodedPath.length
            : 0,
          sample:
            Array.isArray(rawDocument.decodedPath) &&
            rawDocument.decodedPath.length > 0
              ? rawDocument.decodedPath[0]
              : null,
        },
        routeSteps: {
          exists: !!rawDocument.routeSteps,
          type: typeof rawDocument.routeSteps,
          isArray: Array.isArray(rawDocument.routeSteps),
          length: Array.isArray(rawDocument.routeSteps)
            ? rawDocument.routeSteps.length
            : 0,
          sample:
            Array.isArray(rawDocument.routeSteps) &&
            rawDocument.routeSteps.length > 0
              ? rawDocument.routeSteps[0]
              : null,
        },
        waypoints: {
          exists: !!rawDocument.waypoints,
          type: typeof rawDocument.waypoints,
          isArray: Array.isArray(rawDocument.waypoints),
          length: Array.isArray(rawDocument.waypoints)
            ? rawDocument.waypoints.length
            : 0,
          sample:
            Array.isArray(rawDocument.waypoints) &&
            rawDocument.waypoints.length > 0
              ? rawDocument.waypoints[0]
              : null,
        },
        estimatedDistance: {
          exists: !!rawDocument.estimatedDistance,
          value: rawDocument.estimatedDistance,
          text: rawDocument.estimatedDistanceText,
        },
        estimatedDuration: {
          exists: !!rawDocument.estimatedDuration,
          value: rawDocument.estimatedDuration,
          text: rawDocument.estimatedDurationText,
        },
        lastRouteCalculation: {
          exists: !!rawDocument.lastRouteCalculation,
          value: rawDocument.lastRouteCalculation,
        },
      };

      console.log('Google Maps fields analysis:');
      console.log(JSON.stringify(googleMapsFields, null, 2));

      return {
        success: true,
        message: 'Raw data retrieved successfully',
        routeId: rawDocument._id,
        routeName: rawDocument.name,
        googleMapsFields,
        rawData: rawDocument,
      };
    } catch (error) {
      console.error(`Error checking raw data: ${error.message}`);
      return {
        success: false,
        message: `Error checking raw data: ${error.message}`,
        rawData: null,
      };
    }
  }

  @Get('test-save/:id')
  @Roles(Role.ADMIN, Role.LOGISTICA)
  @ApiOperation({
    summary: 'Test direct save to database',
    description: 'Test the calculateAndUpdateRoute method directly',
  })
  @ApiParam({
    name: 'id',
    description: 'ID of the scheduled route to test',
    example: '688301b79937840965cb810e',
  })
  async testSave(@Param('id') id: string): Promise<any> {
    try {
      console.log(`=== Testing direct save for ID: ${id} ===`);

      const result =
        await this.scheduledRouteService.calculateAndUpdateRoute(id);

      console.log(`=== Direct save completed ===`);
      console.log(`Result: ${result.name}`);
      console.log(`Has polyline: ${!!result.routePolyline}`);
      console.log(`Has decoded path: ${!!result.decodedPath}`);

      return {
        success: true,
        message: 'Direct save test completed',
        routeName: result.name,
        hasPolyline: !!result.routePolyline,
        hasDecodedPath: !!result.decodedPath,
        hasRouteSteps: !!result.routeSteps,
        hasWaypoints: !!result.waypoints,
      };
    } catch (error) {
      console.error(`=== Direct save ERROR ===`);
      console.error(`Error: ${error.message}`);
      console.error(`Stack: ${error.stack}`);

      return {
        success: false,
        message: `Direct save failed: ${error.message}`,
        error: error.message,
      };
    }
  }

  @Get('test-route-calculation-simple')
  @Roles(Role.ADMIN, Role.LOGISTICA)
  @ApiOperation({
    summary: 'Test route calculation with hardcoded coordinates',
    description:
      'Test route calculation with simple hardcoded coordinates to isolate API issues',
  })
  @ApiResponse({
    status: 200,
    description: 'Simple route calculation test result',
    schema: {
      type: 'object',
      properties: {
        success: { type: 'boolean' },
        message: { type: 'string' },
        testData: {
          type: 'object',
          properties: {
            distance: { type: 'string' },
            duration: { type: 'string' },
            waypoints: { type: 'number' },
            routeSteps: { type: 'number' },
            polylineLength: { type: 'number' },
            decodedPathPoints: { type: 'number' },
          },
        },
      },
    },
  })
  async testRouteCalculationSimple(): Promise<{
    success: boolean;
    message: string;
    testData: {
      distance: string;
      duration: string;
      waypoints: number;
      routeSteps: number;
      polylineLength: number;
      decodedPathPoints: number;
    };
  }> {
    try {
      console.log(
        '=== Testing Route Calculation with Hardcoded Coordinates ===',
      );

      // Test with simple coordinates (San Francisco to Los Angeles)
      const testPoints = [
        {
          latitude: 37.7749,
          longitude: -122.4194,
          type: 'origen',
          sequenceOrder: 1,
        },
        {
          latitude: 34.0522,
          longitude: -118.2437,
          type: 'destino',
          sequenceOrder: 2,
        },
      ];

      console.log('Test coordinates:');
      testPoints.forEach((point, index) => {
        console.log(
          `  ${index + 1}. ${point.type}: ${point.latitude}, ${point.longitude}`,
        );
      });

      const routeData =
        await this.scheduledRouteService[
          'mapsService'
        ].calculateRouteFromPoints(testPoints);

      console.log('Route calculation successful!');
      console.log(`Distance: ${routeData.estimatedDistanceText}`);
      console.log(`Duration: ${routeData.estimatedDurationText}`);
      console.log(`Waypoints: ${routeData.waypoints.length}`);
      console.log(`Route steps: ${routeData.routeSteps.length}`);
      console.log(`Polyline length: ${routeData.routePolyline.length}`);
      console.log(`Decoded path points: ${routeData.decodedPath.length}`);

      return {
        success: true,
        message: 'Simple route calculation test successful',
        testData: {
          distance: routeData.estimatedDistanceText,
          duration: routeData.estimatedDurationText,
          waypoints: routeData.waypoints.length,
          routeSteps: routeData.routeSteps.length,
          polylineLength: routeData.routePolyline.length,
          decodedPathPoints: routeData.decodedPath.length,
        },
      };
    } catch (error) {
      console.error(`Simple route calculation test failed: ${error.message}`);
      return {
        success: false,
        message: `Simple route calculation test failed: ${error.message}`,
        testData: {
          distance: 'N/A',
          duration: 'N/A',
          waypoints: 0,
          routeSteps: 0,
          polylineLength: 0,
          decodedPathPoints: 0,
        },
      };
    }
  }

  @Get('test-route-calculation/:id')
  @Roles(Role.ADMIN, Role.LOGISTICA)
  @ApiOperation({
    summary: 'Test route calculation for a specific route',
    description:
      'Test the complete route calculation process including Google Maps API, route points, and data saving',
  })
  @ApiParam({
    name: 'id',
    description: 'ID of the scheduled route to test',
    example: '688301b79937840965cb810e',
  })
  @ApiResponse({
    status: 200,
    description: 'Route calculation test result',
    schema: {
      type: 'object',
      properties: {
        success: { type: 'boolean' },
        message: { type: 'string' },
        testResults: {
          type: 'object',
          properties: {
            routePoints: { type: 'number' },
            googleMapsApiWorking: { type: 'boolean' },
            routeCalculation: { type: 'boolean' },
            dataSaved: { type: 'boolean' },
            calculatedDistance: { type: 'string' },
            calculatedDuration: { type: 'string' },
            waypointsCount: { type: 'number' },
            routeStepsCount: { type: 'number' },
            polylineLength: { type: 'number' },
            decodedPathPoints: { type: 'number' },
          },
        },
      },
    },
  })
  async testRouteCalculation(@Param('id') id: string): Promise<{
    success: boolean;
    message: string;
    testResults: {
      routePoints: number;
      googleMapsApiWorking: boolean;
      routeCalculation: boolean;
      dataSaved: boolean;
      calculatedDistance: string;
      calculatedDuration: string;
      waypointsCount: number;
      routeStepsCount: number;
      polylineLength: number;
      decodedPathPoints: number;
    };
  }> {
    try {
      console.log(
        `=== Starting Route Calculation Test for Route ID: ${id} ===`,
      );

      // Test 1: Check if route exists and get route points
      console.log('Test 1: Checking route and route points...');
      const route = await this.scheduledRouteService.findOneWithDetails(id);
      const routePoints = await this.scheduledRouteService['routePointModel']
        .find({ scheduledRouteId: id })
        .sort({ sequenceOrder: 1 })
        .exec();

      console.log(`Route found: ${route.name}`);
      console.log(`Route points found: ${routePoints.length}`);

      if (routePoints.length < 2) {
        return {
          success: false,
          message: `Route must have at least 2 points. Found: ${routePoints.length}`,
          testResults: {
            routePoints: routePoints.length,
            googleMapsApiWorking: false,
            routeCalculation: false,
            dataSaved: false,
            calculatedDistance: 'N/A',
            calculatedDuration: 'N/A',
            waypointsCount: 0,
            routeStepsCount: 0,
            polylineLength: 0,
            decodedPathPoints: 0,
          },
        };
      }

      // Test 2: Test Google Maps API
      console.log('Test 2: Testing Google Maps API...');
      const googleMapsWorking =
        await this.scheduledRouteService['mapsService'].testGoogleMapsAPI();
      console.log(`Google Maps API working: ${googleMapsWorking}`);

      if (!googleMapsWorking) {
        return {
          success: false,
          message:
            'Google Maps API is not working. Check API key and configuration.',
          testResults: {
            routePoints: routePoints.length,
            googleMapsApiWorking: false,
            routeCalculation: false,
            dataSaved: false,
            calculatedDistance: 'N/A',
            calculatedDuration: 'N/A',
            waypointsCount: 0,
            routeStepsCount: 0,
            polylineLength: 0,
            decodedPathPoints: 0,
          },
        };
      }

      // Test 3: Test route calculation
      console.log('Test 3: Testing route calculation...');
      const routePointsForMaps = routePoints.map((point) => ({
        latitude: point.latitude,
        longitude: point.longitude,
        type: point.type,
        sequenceOrder: point.sequenceOrder,
      }));

      console.log('Route points for calculation:');
      routePointsForMaps.forEach((point, index) => {
        console.log(
          `  ${index + 1}. ${point.type}: ${point.latitude}, ${point.longitude} (order: ${point.sequenceOrder})`,
        );
      });

      let routeCalculationSuccess = false;
      let calculatedDistance = 'N/A';
      let calculatedDuration = 'N/A';
      let waypointsCount = 0;
      let routeStepsCount = 0;
      let polylineLength = 0;
      let decodedPathPoints = 0;

      try {
        const routeData =
          await this.scheduledRouteService[
            'mapsService'
          ].calculateRouteFromPoints(routePointsForMaps);

        calculatedDistance = routeData.estimatedDistanceText;
        calculatedDuration = routeData.estimatedDurationText;
        waypointsCount = routeData.waypoints.length;
        routeStepsCount = routeData.routeSteps.length;
        polylineLength = routeData.routePolyline.length;
        decodedPathPoints = routeData.decodedPath.length;

        routeCalculationSuccess = true;
        console.log(
          `Route calculation successful: ${calculatedDistance}, ${calculatedDuration}`,
        );
        console.log(`Waypoints: ${waypointsCount}, Steps: ${routeStepsCount}`);
        console.log(
          `Polyline length: ${polylineLength}, Decoded points: ${decodedPathPoints}`,
        );
      } catch (error) {
        console.error(`Route calculation failed: ${error.message}`);
        routeCalculationSuccess = false;
      }

      // Test 4: Test data saving
      console.log('Test 4: Testing data saving...');
      let dataSaved = false;

      if (routeCalculationSuccess) {
        try {
          const updatedRoute =
            await this.scheduledRouteService.calculateAndUpdateRoute(id);
          dataSaved =
            !!updatedRoute.routePolyline && !!updatedRoute.decodedPath;
          console.log(`Data saved successfully: ${dataSaved}`);
        } catch (error) {
          console.error(`Data saving failed: ${error.message}`);
          dataSaved = false;
        }
      }

      const overallSuccess = routeCalculationSuccess && dataSaved;

      console.log(`=== Route Calculation Test Complete ===`);
      console.log(`Overall Success: ${overallSuccess}`);
      console.log(`Route Points: ${routePoints.length}`);
      console.log(`Google Maps API: ${googleMapsWorking}`);
      console.log(`Route Calculation: ${routeCalculationSuccess}`);
      console.log(`Data Saved: ${dataSaved}`);

      return {
        success: overallSuccess,
        message: overallSuccess
          ? 'Route calculation test completed successfully'
          : 'Route calculation test failed. Check the test results for details.',
        testResults: {
          routePoints: routePoints.length,
          googleMapsApiWorking: googleMapsWorking,
          routeCalculation: routeCalculationSuccess,
          dataSaved: dataSaved,
          calculatedDistance,
          calculatedDuration,
          waypointsCount,
          routeStepsCount,
          polylineLength,
          decodedPathPoints,
        },
      };
    } catch (error) {
      console.error(`Route calculation test error: ${error.message}`);
      return {
        success: false,
        message: `Route calculation test error: ${error.message}`,
        testResults: {
          routePoints: 0,
          googleMapsApiWorking: false,
          routeCalculation: false,
          dataSaved: false,
          calculatedDistance: 'N/A',
          calculatedDuration: 'N/A',
          waypointsCount: 0,
          routeStepsCount: 0,
          polylineLength: 0,
          decodedPathPoints: 0,
        },
      };
    }
  }

  @Get('test-google-maps')
  @Roles(Role.ADMIN, Role.LOGISTICA)
  @ApiOperation({
    summary: 'Test Google Maps API',
    description: 'Test if the Google Maps API is working correctly',
  })
  @ApiResponse({
    status: 200,
    description: 'Google Maps API test result',
    schema: {
      type: 'object',
      properties: {
        success: { type: 'boolean' },
        message: { type: 'string' },
      },
    },
  })
  async testGoogleMaps(): Promise<{ success: boolean; message: string }> {
    try {
      const isWorking =
        await this.scheduledRouteService['mapsService'].testGoogleMapsAPI();
      return {
        success: isWorking,
        message: isWorking
          ? 'Google Maps API is working correctly'
          : 'Google Maps API test failed',
      };
    } catch (error) {
      return {
        success: false,
        message: `Google Maps API test error: ${error.message}`,
      };
    }
  }

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
      'Obtiene vehículos activos con conductores asignados, opcionalmente filtrados por disponibilidad de horario',
  })
  @ApiQuery({
    name: 'startDate',
    required: false,
    description: 'Fecha de inicio para verificar disponibilidad (ISO string)',
    example: '2025-07-26T06:00:00.000Z',
  })
  @ApiQuery({
    name: 'endDate',
    required: false,
    description: 'Fecha de fin para verificar disponibilidad (ISO string)',
    example: '2025-07-26T18:00:00.000Z',
  })
  @ApiResponse({
    status: 200,
    description: 'Lista de vehículos disponibles obtenida exitosamente',
  })
  async getAvailableVehicles(
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
  ) {
    try {
      // Parse dates if provided
      const parsedStartDate = startDate ? new Date(startDate) : undefined;
      const parsedEndDate = endDate ? new Date(endDate) : undefined;

      // Validate dates if both are provided
      if (parsedStartDate && parsedEndDate) {
        if (parsedStartDate >= parsedEndDate) {
          throw new BadRequestException(
            'La fecha de inicio debe ser anterior a la fecha de fin',
          );
        }
      }

      return await this.scheduledRouteService.getAvailableVehiclesWithDrivers(
        parsedStartDate,
        parsedEndDate,
      );
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

  @Get('available-drivers')
  @Roles(Role.ADMIN, Role.LOGISTICA)
  @ApiOperation({
    summary: 'Obtener conductores disponibles con vehículos asignados',
    description:
      'Obtiene conductores con vehículos asignados, opcionalmente filtrados por disponibilidad de horario',
  })
  @ApiQuery({
    name: 'startDate',
    required: false,
    description: 'Fecha de inicio para verificar disponibilidad (ISO string)',
    example: '2025-07-26T06:00:00.000Z',
  })
  @ApiQuery({
    name: 'endDate',
    required: false,
    description: 'Fecha de fin para verificar disponibilidad (ISO string)',
    example: '2025-07-26T18:00:00.000Z',
  })
  @ApiResponse({
    status: 200,
    description: 'Lista de conductores disponibles obtenida exitosamente',
  })
  async getAvailableDrivers(
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
  ) {
    try {
      // Parse dates if provided
      const parsedStartDate = startDate ? new Date(startDate) : undefined;
      const parsedEndDate = endDate ? new Date(endDate) : undefined;

      // Validate dates if both are provided
      if (parsedStartDate && parsedEndDate) {
        if (parsedStartDate >= parsedEndDate) {
          throw new BadRequestException(
            'La fecha de inicio debe ser anterior a la fecha de fin',
          );
        }
      }

      return await this.scheduledRouteService.getAvailableDriversWithVehicles(
        parsedStartDate,
        parsedEndDate,
      );
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
      console.log(`=== Starting calculateRoute for ID: ${id} ===`);

      const route =
        await this.scheduledRouteService.calculateAndUpdateRoute(id);

      console.log(`=== calculateRoute completed successfully ===`);
      return this.scheduledRouteService.formatRouteResponse(route as any);
    } catch (error) {
      console.error(`=== calculateRoute ERROR ===`);
      console.error(`Error type: ${error.constructor.name}`);
      console.error(`Error message: ${error.message}`);
      console.error(`Error stack: ${error.stack}`);

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
