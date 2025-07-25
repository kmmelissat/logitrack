import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  UseGuards,
  Query,
} from '@nestjs/common';
import { VehicleService } from './vehicle.service';
import { CreateVehicleDto } from './dto/create-vehicle.dto';
import { UpdateVehicleDto } from './dto/update-vehicle.dto';
import { DriverVehicleUpdateDto } from './dto/driver-vehicle-update.dto';
import { VehicleAssignmentDto } from './dto/vehicle-assignment.dto';
import { VehicleResponseDto } from './dto/vehicle-response.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { Role } from '../auth/enums/role.enum';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiQuery,
} from '@nestjs/swagger';

@ApiTags('vehicles')
@ApiBearerAuth()
@Controller('vehicles')
@UseGuards(JwtAuthGuard, RolesGuard)
export class VehicleController {
  constructor(private readonly vehicleService: VehicleService) {}

  @Post()
  @Roles(Role.ADMIN, Role.LOGISTICA)
  @ApiOperation({ summary: 'Create a new vehicle' })
  @ApiResponse({
    status: 201,
    description: 'Vehicle created successfully',
    type: VehicleResponseDto,
  })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 403, description: 'Forbidden' })
  @ApiResponse({ status: 400, description: 'Bad request - validation error' })
  create(@Body() createVehicleDto: CreateVehicleDto) {
    return this.vehicleService.create(createVehicleDto);
  }

  @Get()
  @Roles(Role.ADMIN, Role.LOGISTICA, Role.CONDUCTOR)
  @ApiOperation({ summary: 'Get all vehicles' })
  @ApiResponse({
    status: 200,
    description: 'Returns all vehicles',
    type: [VehicleResponseDto],
  })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 403, description: 'Forbidden' })
  @ApiQuery({
    name: 'status',
    required: false,
    description: 'Filter by status (activo, taller, descontinuado)',
    enum: ['activo', 'taller', 'descontinuado'],
  })
  @ApiQuery({
    name: 'driverId',
    required: false,
    description: 'Filter by assigned driver ID',
  })
  @ApiQuery({
    name: 'available',
    required: false,
    description: 'Get only available (unassigned) vehicles',
    enum: ['true', 'false'],
  })
  findAll(
    @Query('status') status?: string,
    @Query('driverId') driverId?: string,
    @Query('available') available?: string,
  ) {
    if (available === 'true') {
      return this.vehicleService.findAvailableVehicles();
    }
    if (driverId) {
      return this.vehicleService.findByAssignedDriver(driverId);
    }
    if (status) {
      return this.vehicleService.findByStatus(status);
    }
    return this.vehicleService.findAll();
  }

  @Get(':id')
  @Roles(Role.ADMIN, Role.LOGISTICA, Role.CONDUCTOR)
  @ApiOperation({ summary: 'Get a vehicle by ID' })
  @ApiResponse({
    status: 200,
    description: 'Returns the vehicle',
    type: VehicleResponseDto,
  })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 403, description: 'Forbidden' })
  @ApiResponse({ status: 404, description: 'Vehicle not found' })
  findOne(@Param('id') id: string) {
    return this.vehicleService.findOne(id);
  }

  @Patch(':id')
  @Roles(Role.ADMIN, Role.LOGISTICA)
  @ApiOperation({ summary: 'Update a vehicle (Admin/Logistics only)' })
  @ApiResponse({
    status: 200,
    description: 'Vehicle updated successfully',
    type: VehicleResponseDto,
  })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 403, description: 'Forbidden' })
  @ApiResponse({ status: 404, description: 'Vehicle not found' })
  @ApiResponse({ status: 400, description: 'Bad request - validation error' })
  update(@Param('id') id: string, @Body() updateVehicleDto: UpdateVehicleDto) {
    return this.vehicleService.update(id, updateVehicleDto);
  }

  @Patch(':id/driver-update')
  @Roles(Role.CONDUCTOR)
  @ApiOperation({ summary: 'Update vehicle info by driver (limited fields)' })
  @ApiResponse({
    status: 200,
    description: 'Vehicle updated successfully',
    type: VehicleResponseDto,
  })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 403, description: 'Forbidden' })
  @ApiResponse({ status: 404, description: 'Vehicle not found' })
  @ApiResponse({ status: 400, description: 'Bad request - validation error' })
  updateDriverInfo(
    @Param('id') id: string,
    @Body() driverUpdateDto: DriverVehicleUpdateDto,
  ) {
    return this.vehicleService.updateDriverInfo(id, driverUpdateDto);
  }

  @Patch(':id/assign')
  @Roles(Role.ADMIN, Role.LOGISTICA)
  @ApiOperation({ summary: 'Assign vehicle to a driver' })
  @ApiResponse({
    status: 200,
    description: 'Vehicle assigned successfully',
    type: VehicleResponseDto,
  })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 403, description: 'Forbidden' })
  @ApiResponse({ status: 404, description: 'Vehicle not found' })
  @ApiResponse({
    status: 400,
    description:
      'Vehicle not available for assignment or driver already assigned',
  })
  assignVehicle(
    @Param('id') id: string,
    @Body() assignmentDto: VehicleAssignmentDto,
  ) {
    return this.vehicleService.assignVehicle(id, assignmentDto);
  }

  @Get(':id/available')
  @Roles(Role.ADMIN, Role.LOGISTICA)
  @ApiOperation({ summary: 'Check if vehicle is available for assignment' })
  @ApiResponse({
    status: 200,
    description: 'Vehicle availability status',
    schema: {
      type: 'object',
      properties: {
        available: { type: 'boolean' },
        message: { type: 'string' },
      },
    },
  })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 403, description: 'Forbidden' })
  @ApiResponse({ status: 404, description: 'Vehicle not found' })
  async checkVehicleAvailability(@Param('id') id: string) {
    const available = await this.vehicleService.isVehicleAvailable(id);
    return {
      available,
      message: available
        ? 'Vehicle is available for assignment'
        : 'Vehicle is not available for assignment',
    };
  }

  @Get('driver/:driverId/available')
  @Roles(Role.ADMIN, Role.LOGISTICA)
  @ApiOperation({ summary: 'Check if driver is available for assignment' })
  @ApiResponse({
    status: 200,
    description: 'Driver availability status',
    schema: {
      type: 'object',
      properties: {
        available: { type: 'boolean' },
        message: { type: 'string' },
      },
    },
  })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 403, description: 'Forbidden' })
  async checkDriverAvailability(@Param('driverId') driverId: string) {
    const available = await this.vehicleService.isDriverAvailable(driverId);
    return {
      available,
      message: available
        ? 'Driver is available for assignment'
        : 'Driver is already assigned to a vehicle',
    };
  }

  @Patch(':id/unassign')
  @Roles(Role.ADMIN, Role.LOGISTICA)
  @ApiOperation({ summary: 'Unassign vehicle from driver' })
  @ApiResponse({
    status: 200,
    description: 'Vehicle unassigned successfully',
    type: VehicleResponseDto,
  })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 403, description: 'Forbidden' })
  @ApiResponse({ status: 404, description: 'Vehicle not found' })
  unassignVehicle(@Param('id') id: string) {
    return this.vehicleService.unassignVehicle(id);
  }

  @Patch(':id/retire')
  @Roles(Role.ADMIN)
  @ApiOperation({ summary: 'Retire a vehicle (soft delete - Admin only)' })
  @ApiResponse({
    status: 200,
    description: 'Vehicle retired successfully',
    type: VehicleResponseDto,
  })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 403, description: 'Forbidden' })
  @ApiResponse({ status: 404, description: 'Vehicle not found' })
  retireVehicle(@Param('id') id: string) {
    return this.vehicleService.retireVehicle(id);
  }

  @Delete(':id')
  @Roles(Role.ADMIN)
  @ApiOperation({ summary: 'Delete a vehicle permanently (Admin only)' })
  @ApiResponse({
    status: 200,
    description: 'Vehicle deleted successfully',
    type: VehicleResponseDto,
  })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 403, description: 'Forbidden' })
  @ApiResponse({ status: 404, description: 'Vehicle not found' })
  remove(@Param('id') id: string) {
    return this.vehicleService.remove(id);
  }
}
