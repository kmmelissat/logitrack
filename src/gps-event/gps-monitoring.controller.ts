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
    const stopped =
      await this.gpsSimulatorService.stopDriverSimulation(driverId);

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
}
