import {
  Controller,
  Get,
  Post,
  Delete,
  Param,
  Body,
  UseGuards,
  Query,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiParam,
  ApiBody,
  ApiQuery,
} from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { Role } from '../auth/enums/role.enum';
import { GpsSimulatorService } from './gps-simulator.service';
import { GpsEventService } from './gps-event.service';

export interface StartSimulationDto {
  driverId: string;
  vehicleId: string;
  scheduledRouteId: string;
}

export interface DriverMonitoringResponse {
  driverId: string;
  vehicleId: string;
  scheduledRouteId: string;
  currentLocation: {
    lat: number;
    lng: number;
  };
  routeProgress: number;
  distanceFromRoute: number;
  speed: number;
  estimatedArrival: Date;
  deviations: number;
  alerts: any[];
  isOnRoute: boolean;
  nextCheckpoint: {
    name: string;
    distance: number;
    eta: number;
  };
  status: 'active' | 'completed' | 'stopped';
}

@ApiTags('gps-monitoring')
@Controller('gps-monitoring')
@UseGuards(JwtAuthGuard, RolesGuard)
@ApiBearerAuth()
export class GpsMonitoringController {
  constructor(
    private readonly gpsSimulatorService: GpsSimulatorService,
    private readonly gpsEventService: GpsEventService,
  ) {}

  @Post('simulation/start')
  @Roles(Role.ADMIN, Role.LOGISTICA)
  @ApiOperation({
    summary: 'Start GPS simulation for a driver',
    description: 'Start simulating driver movement along a scheduled route',
  })
  @ApiBody({
    description: 'Simulation parameters',
    examples: {
      example: {
        summary: 'Start simulation',
        value: {
          driverId: '507f1f77bcf86cd799439011',
          vehicleId: '507f1f77bcf86cd799439012',
          scheduledRouteId: '507f1f77bcf86cd799439013',
        },
      },
    },
  })
  @ApiResponse({
    status: 201,
    description: 'GPS simulation started successfully',
  })
  @ApiResponse({ status: 400, description: 'Invalid parameters' })
  @ApiResponse({
    status: 404,
    description: 'Driver, vehicle, or route not found',
  })
  async startSimulation(@Body() startSimulationDto: StartSimulationDto) {
    const simulation = await this.gpsSimulatorService.startDriverSimulation(
      startSimulationDto.driverId,
      startSimulationDto.vehicleId,
      startSimulationDto.scheduledRouteId,
    );

    return {
      message: 'GPS simulation started successfully',
      simulation,
    };
  }

  @Delete('simulation/stop/:driverId')
  @Roles(Role.ADMIN, Role.LOGISTICA)
  @ApiOperation({
    summary: 'Stop GPS simulation for a driver',
    description: 'Stop simulating driver movement',
  })
  @ApiParam({
    name: 'driverId',
    description: 'ID of the driver to stop simulation for',
  })
  @ApiResponse({
    status: 200,
    description: 'GPS simulation stopped successfully',
  })
  @ApiResponse({ status: 404, description: 'Driver simulation not found' })
  async stopSimulation(@Param('driverId') driverId: string) {
    const stopped = this.gpsSimulatorService.stopDriverSimulation(driverId);

    if (!stopped) {
      throw new Error('Driver simulation not found');
    }

    return {
      message: 'GPS simulation stopped successfully',
      driverId,
    };
  }

  @Delete('simulation/stop-all')
  @Roles(Role.ADMIN, Role.LOGISTICA)
  @ApiOperation({
    summary: 'Stop all GPS simulations',
    description: 'Stop all active driver simulations',
  })
  @ApiResponse({
    status: 200,
    description: 'All GPS simulations stopped successfully',
  })
  async stopAllSimulations() {
    this.gpsSimulatorService.stopSimulation();

    return {
      message: 'All GPS simulations stopped successfully',
    };
  }

  @Get('driver/:driverId')
  @Roles(Role.ADMIN, Role.LOGISTICA, Role.CONDUCTOR)
  @ApiOperation({
    summary: 'Get driver monitoring data',
    description: 'Get real-time monitoring data for a specific driver',
  })
  @ApiParam({
    name: 'driverId',
    description: 'ID of the driver to monitor',
  })
  @ApiResponse({
    status: 200,
    description: 'Driver monitoring data retrieved successfully',
  })
  @ApiResponse({ status: 404, description: 'Driver not found or not active' })
  async getDriverMonitoring(@Param('driverId') driverId: string) {
    const monitoringData =
      await this.gpsSimulatorService.getDriverMonitoringData(driverId);

    if (!monitoringData) {
      throw new Error('Driver not found or not active');
    }

    return {
      ...monitoringData,
      status: 'active',
    };
  }

  @Get('drivers')
  @Roles(Role.ADMIN, Role.LOGISTICA)
  @ApiOperation({
    summary: 'Get all active drivers monitoring data',
    description: 'Get real-time monitoring data for all active drivers',
  })
  @ApiResponse({
    status: 200,
    description: 'All drivers monitoring data retrieved successfully',
  })
  async getAllDriversMonitoring() {
    const monitoringData =
      await this.gpsSimulatorService.getAllDriversMonitoringData();

    return monitoringData.map((data) => ({
      ...data,
      status: 'active',
    }));
  }

  @Get('route/:scheduledRouteId/analytics')
  @Roles(Role.ADMIN, Role.LOGISTICA)
  @ApiOperation({
    summary: 'Get route analytics',
    description: 'Get analytics and statistics for a specific route',
  })
  @ApiParam({
    name: 'scheduledRouteId',
    description: 'ID of the scheduled route',
  })
  @ApiResponse({
    status: 200,
    description: 'Route analytics retrieved successfully',
  })
  async getRouteAnalytics(@Param('scheduledRouteId') scheduledRouteId: string) {
    const analytics =
      await this.gpsEventService.getRouteAnalytics(scheduledRouteId);

    return {
      routeId: scheduledRouteId,
      analytics,
    };
  }

  @Get('deviations')
  @Roles(Role.ADMIN, Role.LOGISTICA)
  @ApiOperation({
    summary: 'Get route deviations',
    description: 'Get all route deviation events',
  })
  @ApiQuery({
    name: 'vehicleId',
    required: false,
    description: 'Filter by vehicle ID',
  })
  @ApiQuery({
    name: 'startDate',
    required: false,
    description: 'Start date for filtering (ISO string)',
  })
  @ApiQuery({
    name: 'endDate',
    required: false,
    description: 'End date for filtering (ISO string)',
  })
  @ApiResponse({
    status: 200,
    description: 'Route deviations retrieved successfully',
  })
  async getDeviations(
    @Query('vehicleId') vehicleId?: string,
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
  ) {
    const start = startDate ? new Date(startDate) : undefined;
    const end = endDate ? new Date(endDate) : undefined;

    const deviations = await this.gpsEventService.findDeviations(
      vehicleId,
      start,
      end,
    );

    return {
      deviations,
      count: deviations.length,
    };
  }

  @Get('vehicle/:vehicleId/current-location')
  @Roles(Role.ADMIN, Role.LOGISTICA, Role.CONDUCTOR)
  @ApiOperation({
    summary: 'Get vehicle current location',
    description: 'Get the most recent GPS location for a vehicle',
  })
  @ApiParam({
    name: 'vehicleId',
    description: 'ID of the vehicle',
  })
  @ApiResponse({
    status: 200,
    description: 'Vehicle current location retrieved successfully',
  })
  @ApiResponse({ status: 404, description: 'Vehicle location not found' })
  async getVehicleCurrentLocation(@Param('vehicleId') vehicleId: string) {
    const location =
      await this.gpsEventService.getVehicleCurrentLocation(vehicleId);

    if (!location) {
      throw new Error('Vehicle location not found');
    }

    return {
      vehicleId,
      location: {
        lat: location.latitude,
        lng: location.longitude,
        timestamp: location.timestamp,
        speed: location.speed,
        heading: location.heading,
      },
    };
  }



  @Get('alerts')
  @Roles(Role.ADMIN, Role.LOGISTICA)
  @ApiOperation({
    summary: 'Get GPS alerts',
    description: 'Get all GPS alerts and events',
  })
  @ApiQuery({
    name: 'vehicleId',
    required: false,
    description: 'Filter by vehicle ID',
  })
  @ApiQuery({
    name: 'eventType',
    required: false,
    description: 'Filter by event type',
  })
  @ApiQuery({
    name: 'severity',
    required: false,
    description: 'Filter by alert severity',
  })
  @ApiResponse({
    status: 200,
    description: 'GPS alerts retrieved successfully',
  })
  async getAlerts(
    @Query('vehicleId') vehicleId?: string,
    @Query('eventType') eventType?: string,
    @Query('severity') severity?: string,
  ) {
    const filter: any = { isAlert: true };

    if (vehicleId) {
      filter.vehicleId = vehicleId;
    }

    if (eventType) {
      filter.eventType = eventType;
    }

    if (severity) {
      filter.severity = severity;
    }

    const alerts = await this.gpsEventService.findAll(filter);

    return {
      alerts,
      count: alerts.length,
    };
  }
}
