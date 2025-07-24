import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  Query,
  UseGuards,
  Request,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiQuery,
  ApiBody,
} from '@nestjs/swagger';
import {
  VehicleCheckinService,
  CreateCheckinDto,
} from './vehicle-checkin.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { Role } from '../auth/enums/role.enum';
import { CheckinType } from './entities/vehicle-checkin.entity';

@ApiTags('vehicle-checkins')
@Controller('vehicle-checkins')
@UseGuards(JwtAuthGuard, RolesGuard)
@ApiBearerAuth()
export class VehicleCheckinController {
  constructor(private readonly vehicleCheckinService: VehicleCheckinService) {}

  @Post('checkin')
  @Roles(Role.CONDUCTOR)
  @ApiOperation({
    summary: 'Check in to vehicle (Driver only)',
    description:
      'Driver checks in to an assigned vehicle and optionally to a scheduled route',
  })
  @ApiBody({
    description: 'Check-in data',
    examples: {
      basic: {
        summary: 'Basic check-in',
        value: {
          vehicleId: '507f1f77bcf86cd799439011',
          type: 'check_in',
          latitude: 13.6929,
          longitude: -89.2182,
          location: 'Terminal San Salvador',
          mileage: 45000,
          fuelLevel: 75,
          notes: 'Starting route to Tegucigalpa',
        },
      },
      withRoute: {
        summary: 'Check-in with route assignment',
        value: {
          vehicleId: '507f1f77bcf86cd799439011',
          scheduledRouteId: '507f1f77bcf86cd799439012',
          type: 'check_in',
          latitude: 13.6929,
          longitude: -89.2182,
          location: 'Terminal San Salvador',
          mileage: 45000,
          fuelLevel: 75,
          vehicleCondition: {
            engineOk: true,
            tiresOk: true,
            lightsOk: true,
            brakesOk: true,
            documentsOk: true,
          },
          notes: 'Vehicle in good condition, ready for route',
        },
      },
    },
  })
  @ApiResponse({
    status: 201,
    description: 'Successfully checked in to vehicle',
  })
  @ApiResponse({
    status: 400,
    description: 'Invalid data or vehicle already checked in',
  })
  @ApiResponse({ status: 404, description: 'Vehicle or route not found' })
  async checkIn(
    @Body() createCheckinDto: CreateCheckinDto,
    @Request() req: any,
  ) {
    const driverId = req.user.id;
    return this.vehicleCheckinService.checkIn(createCheckinDto, driverId);
  }

  @Post('checkout/:vehicleId')
  @Roles(Role.CONDUCTOR)
  @ApiOperation({
    summary: 'Check out from vehicle (Driver only)',
    description:
      'Driver checks out from the vehicle they are currently checked into',
  })
  @ApiBody({
    description: 'Check-out data',
    examples: {
      basic: {
        summary: 'Basic check-out',
        value: {
          notes: 'Route completed successfully',
        },
      },
    },
  })
  @ApiResponse({
    status: 201,
    description: 'Successfully checked out from vehicle',
  })
  @ApiResponse({
    status: 400,
    description: 'No active check-in found or unauthorized',
  })
  @ApiResponse({ status: 404, description: 'Vehicle not found' })
  async checkOut(
    @Param('vehicleId') vehicleId: string,
    @Body() body: { notes?: string },
    @Request() req: any,
  ) {
    const driverId = req.user.id;
    return this.vehicleCheckinService.checkOut(vehicleId, driverId, body.notes);
  }

  @Get()
  @Roles(Role.ADMIN, Role.LOGISTICA)
  @ApiOperation({
    summary: 'Get all check-in/check-out records',
    description:
      'Retrieve all vehicle check-in and check-out records with optional filtering',
  })
  @ApiQuery({
    name: 'vehicleId',
    required: false,
    description: 'Filter by vehicle ID',
  })
  @ApiQuery({
    name: 'driverId',
    required: false,
    description: 'Filter by driver ID',
  })
  @ApiQuery({
    name: 'type',
    required: false,
    enum: CheckinType,
    description: 'Filter by check-in type',
  })
  @ApiQuery({
    name: 'isValid',
    required: false,
    description: 'Filter by valid status (true/false)',
  })
  @ApiQuery({
    name: 'scheduledRouteId',
    required: false,
    description: 'Filter by scheduled route ID',
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
    description: 'Check-in records retrieved successfully',
  })
  async findAll(@Query() query: any) {
    return this.vehicleCheckinService.findAll(query);
  }

  @Get('vehicle/:vehicleId')
  @Roles(Role.ADMIN, Role.LOGISTICA, Role.CONDUCTOR)
  @ApiOperation({
    summary: 'Get check-in history for specific vehicle',
    description:
      'Retrieve all check-in and check-out records for a specific vehicle',
  })
  @ApiResponse({
    status: 200,
    description: 'Vehicle check-in history retrieved successfully',
  })
  @ApiResponse({ status: 404, description: 'Vehicle not found' })
  async findByVehicle(@Param('vehicleId') vehicleId: string) {
    return this.vehicleCheckinService.findByVehicle(vehicleId);
  }

  @Get('driver/:driverId')
  @Roles(Role.ADMIN, Role.LOGISTICA, Role.CONDUCTOR)
  @ApiOperation({
    summary: 'Get check-in history for specific driver',
    description:
      'Retrieve all check-in and check-out records for a specific driver',
  })
  @ApiResponse({
    status: 200,
    description: 'Driver check-in history retrieved successfully',
  })
  @ApiResponse({ status: 404, description: 'Driver not found' })
  async findByDriver(@Param('driverId') driverId: string) {
    return this.vehicleCheckinService.findByDriver(driverId);
  }

  @Get('vehicle/:vehicleId/status')
  @Roles(Role.ADMIN, Role.LOGISTICA, Role.CONDUCTOR)
  @ApiOperation({
    summary: 'Get vehicle check-in status',
    description:
      'Get current check-in status and assigned driver for a vehicle',
  })
  @ApiResponse({
    status: 200,
    description: 'Vehicle status retrieved successfully',
  })
  @ApiResponse({ status: 404, description: 'Vehicle not found' })
  async getVehicleStatus(@Param('vehicleId') vehicleId: string) {
    return this.vehicleCheckinService.getVehicleStatus(vehicleId);
  }

  @Get('driver/:driverId/current-vehicle')
  @Roles(Role.ADMIN, Role.LOGISTICA, Role.CONDUCTOR)
  @ApiOperation({
    summary: 'Get driver current vehicle',
    description: 'Get the vehicle that a driver is currently checked into',
  })
  @ApiResponse({
    status: 200,
    description: 'Driver current vehicle retrieved successfully',
  })
  @ApiResponse({ status: 404, description: 'Driver not found' })
  async getDriverCurrentVehicle(@Param('driverId') driverId: string) {
    return this.vehicleCheckinService.getDriverCurrentVehicle(driverId);
  }

  @Get('vehicle/:vehicleId/history')
  @Roles(Role.ADMIN, Role.LOGISTICA)
  @ApiOperation({
    summary: 'Get vehicle check-in history',
    description: 'Get check-in history for a vehicle over a specified period',
  })
  @ApiQuery({
    name: 'days',
    required: false,
    description: 'Number of days to look back (default: 30)',
  })
  @ApiResponse({
    status: 200,
    description: 'Vehicle check-in history retrieved successfully',
  })
  @ApiResponse({ status: 404, description: 'Vehicle not found' })
  async getCheckinHistory(
    @Param('vehicleId') vehicleId: string,
    @Query('days') days?: string,
  ) {
    const daysNum = days ? parseInt(days) : 30;
    return this.vehicleCheckinService.getCheckinHistory(vehicleId, daysNum);
  }

  @Get(':id')
  @Roles(Role.ADMIN, Role.LOGISTICA, Role.CONDUCTOR)
  @ApiOperation({
    summary: 'Get check-in record by ID',
    description: 'Retrieve a specific check-in or check-out record by its ID',
  })
  @ApiResponse({
    status: 200,
    description: 'Check-in record retrieved successfully',
  })
  @ApiResponse({ status: 404, description: 'Check-in record not found' })
  async findOne(@Param('id') id: string) {
    return this.vehicleCheckinService.findOne(id);
  }
}
