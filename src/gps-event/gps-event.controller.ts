import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  Query,
  UseGuards,
  Request,
  Patch,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiQuery,
  ApiBody,
} from '@nestjs/swagger';
import { GpsEventService, CreateGpsEventDto } from './gps-event.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { Role } from '../auth/enums/role.enum';
import { EventType } from './entities/gps-event.entity';

@ApiTags('gps-events')
@Controller('gps-events')
@UseGuards(JwtAuthGuard, RolesGuard)
@ApiBearerAuth()
export class GpsEventController {
  constructor(private readonly gpsEventService: GpsEventService) {}

  @Post()
  @Roles(Role.CONDUCTOR)
  @ApiOperation({
    summary: 'Report GPS event (Driver only)',
    description:
      'Report current GPS location and automatically detect route deviations',
  })
  @ApiBody({
    description: 'GPS event data',
    examples: {
      basic: {
        summary: 'Basic GPS report',
        value: {
          vehicleId: '507f1f77bcf86cd799439011',
          scheduledRouteId: '507f1f77bcf86cd799439012',
          latitude: 13.6929,
          longitude: -89.2182,
          speed: 65,
          heading: 180,
          accuracy: 10,
        },
      },
      withEventData: {
        summary: 'GPS report with additional data',
        value: {
          vehicleId: '507f1f77bcf86cd799439011',
          scheduledRouteId: '507f1f77bcf86cd799439012',
          latitude: 13.6929,
          longitude: -89.2182,
          speed: 65,
          heading: 180,
          altitude: 850,
          satellites: 8,
          accuracy: 10,
          eventData: {
            fuel: { level: 75, consumption: 12.5 },
            engine: { rpm: 2200, temperature: 85, oilPressure: 45 },
            cargo: { weight: 3500, temperature: 22, humidity: 45 },
          },
        },
      },
    },
  })
  @ApiResponse({ status: 201, description: 'GPS event created successfully' })
  @ApiResponse({
    status: 400,
    description: 'Invalid data or driver not assigned to vehicle',
  })
  @ApiResponse({ status: 404, description: 'Vehicle or route not found' })
  async create(
    @Body() createGpsEventDto: CreateGpsEventDto,
    @Request() req: any,
  ) {
    const driverId = req.user.id;
    return this.gpsEventService.create(createGpsEventDto, driverId);
  }

  @Get()
  @Roles(Role.ADMIN, Role.LOGISTICA)
  @ApiOperation({
    summary: 'Get GPS events with filters',
    description:
      'Retrieve GPS events with optional filtering by vehicle, route, type, etc.',
  })
  @ApiQuery({
    name: 'vehicleId',
    required: false,
    description: 'Filter by vehicle ID',
  })
  @ApiQuery({
    name: 'scheduledRouteId',
    required: false,
    description: 'Filter by route ID',
  })
  @ApiQuery({
    name: 'eventType',
    required: false,
    enum: EventType,
    description: 'Filter by event type',
  })
  @ApiQuery({
    name: 'isAlert',
    required: false,
    description: 'Filter by alert status (true/false)',
  })
  @ApiQuery({
    name: 'isDeviation',
    required: false,
    description: 'Filter by route deviation (true/false)',
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
    description: 'GPS events retrieved successfully',
  })
  async findAll(@Query() query: any) {
    return this.gpsEventService.findAll(query);
  }

  @Get('deviations')
  @Roles(Role.ADMIN, Role.LOGISTICA)
  @ApiOperation({
    summary: 'Get route deviation events',
    description: 'Retrieve all route deviation events with optional filtering',
  })
  @ApiQuery({
    name: 'vehicleId',
    required: false,
    description: 'Filter by vehicle ID',
  })
  @ApiQuery({
    name: 'startDate',
    required: false,
    description: 'Start date for filtering',
  })
  @ApiQuery({
    name: 'endDate',
    required: false,
    description: 'End date for filtering',
  })
  @ApiResponse({
    status: 200,
    description: 'Route deviations retrieved successfully',
  })
  async findDeviations(
    @Query('vehicleId') vehicleId?: string,
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
  ) {
    const start = startDate ? new Date(startDate) : undefined;
    const end = endDate ? new Date(endDate) : undefined;
    return this.gpsEventService.findDeviations(vehicleId, start, end);
  }

  @Get('vehicle/:vehicleId')
  @Roles(Role.ADMIN, Role.LOGISTICA, Role.CONDUCTOR)
  @ApiOperation({
    summary: 'Get GPS events for specific vehicle',
    description:
      'Retrieve GPS events for a specific vehicle (limited to recent events)',
  })
  @ApiQuery({
    name: 'limit',
    required: false,
    description: 'Number of events to return (default: 100)',
  })
  @ApiResponse({
    status: 200,
    description: 'Vehicle GPS events retrieved successfully',
  })
  @ApiResponse({ status: 404, description: 'Vehicle not found' })
  async findByVehicle(
    @Param('vehicleId') vehicleId: string,
    @Query('limit') limit?: string,
  ) {
    const limitNum = limit ? parseInt(limit) : 100;
    return this.gpsEventService.findByVehicle(vehicleId, limitNum);
  }

  @Get('route/:scheduledRouteId')
  @Roles(Role.ADMIN, Role.LOGISTICA, Role.CONDUCTOR)
  @ApiOperation({
    summary: 'Get GPS events for specific route',
    description: 'Retrieve all GPS events for a specific scheduled route',
  })
  @ApiResponse({
    status: 200,
    description: 'Route GPS events retrieved successfully',
  })
  @ApiResponse({ status: 404, description: 'Route not found' })
  async findByRoute(@Param('scheduledRouteId') scheduledRouteId: string) {
    return this.gpsEventService.findByRoute(scheduledRouteId);
  }

  @Get('vehicle/:vehicleId/current-location')
  @Roles(Role.ADMIN, Role.LOGISTICA, Role.CONDUCTOR)
  @ApiOperation({
    summary: 'Get vehicle current location',
    description:
      'Get the most recent GPS event for a vehicle (current location)',
  })
  @ApiResponse({
    status: 200,
    description: 'Vehicle current location retrieved successfully',
  })
  @ApiResponse({
    status: 404,
    description: 'Vehicle not found or no GPS events',
  })
  async getVehicleCurrentLocation(@Param('vehicleId') vehicleId: string) {
    const location =
      await this.gpsEventService.getVehicleCurrentLocation(vehicleId);
    if (!location) {
      return { message: 'No GPS events found for this vehicle' };
    }
    return location;
  }

  @Get('route/:scheduledRouteId/analytics')
  @Roles(Role.ADMIN, Role.LOGISTICA)
  @ApiOperation({
    summary: 'Get route analytics',
    description: 'Get analytics and statistics for a specific route',
  })
  @ApiResponse({
    status: 200,
    description: 'Route analytics retrieved successfully',
  })
  @ApiResponse({ status: 404, description: 'Route not found' })
  async getRouteAnalytics(@Param('scheduledRouteId') scheduledRouteId: string) {
    return this.gpsEventService.getRouteAnalytics(scheduledRouteId);
  }

  @Get(':id')
  @Roles(Role.ADMIN, Role.LOGISTICA, Role.CONDUCTOR)
  @ApiOperation({
    summary: 'Get GPS event by ID',
    description: 'Retrieve a specific GPS event by its ID',
  })
  @ApiResponse({ status: 200, description: 'GPS event retrieved successfully' })
  @ApiResponse({ status: 404, description: 'GPS event not found' })
  async findOne(@Param('id') id: string) {
    return this.gpsEventService.findOne(id);
  }

  @Patch(':id/acknowledge')
  @Roles(Role.ADMIN, Role.LOGISTICA)
  @ApiOperation({
    summary: 'Acknowledge GPS alert',
    description: 'Mark a GPS alert as acknowledged by logistics staff',
  })
  @ApiResponse({ status: 200, description: 'Alert acknowledged successfully' })
  @ApiResponse({ status: 404, description: 'GPS event not found' })
  async acknowledgeAlert(@Param('id') id: string) {
    return this.gpsEventService.acknowledgeAlert(id);
  }
}
