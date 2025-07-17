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
import { MaintenanceService } from './maintenance.service';
import { CreateMaintenanceDto } from './dto/create-maintenance.dto';
import { UpdateMaintenanceDto } from './dto/update-maintenance.dto';
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

@ApiTags('maintenance')
@ApiBearerAuth()
@Controller('maintenance')
@UseGuards(JwtAuthGuard, RolesGuard)
export class MaintenanceController {
  constructor(private readonly maintenanceService: MaintenanceService) {}

  @Post()
  @Roles(Role.ADMIN, Role.LOGISTICA)
  @ApiOperation({ summary: 'Create a new maintenance record' })
  @ApiResponse({ status: 201, description: 'Maintenance created successfully' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 403, description: 'Forbidden' })
  create(@Body() createMaintenanceDto: CreateMaintenanceDto) {
    return this.maintenanceService.create(createMaintenanceDto);
  }

  @Get()
  @Roles(Role.ADMIN, Role.LOGISTICA, Role.CONDUCTOR)
  @ApiOperation({ summary: 'Get all maintenance records' })
  @ApiResponse({ status: 200, description: 'Returns all maintenance records' })
  @ApiQuery({
    name: 'vehicleId',
    required: false,
    description: 'Filter by vehicle ID',
  })
  @ApiQuery({
    name: 'type',
    required: false,
    description: 'Filter by maintenance type',
  })
  @ApiQuery({
    name: 'pending',
    required: false,
    description: 'Get pending maintenances',
  })
  findAll(
    @Query('vehicleId') vehicleId?: string,
    @Query('type') type?: string,
    @Query('pending') pending?: string,
  ) {
    if (vehicleId) {
      return this.maintenanceService.findByVehicle(vehicleId);
    }
    if (type) {
      return this.maintenanceService.findByType(type);
    }
    if (pending === 'true') {
      return this.maintenanceService.findPendingMaintenances();
    }
    return this.maintenanceService.findAll();
  }

  @Get(':id')
  @Roles(Role.ADMIN, Role.LOGISTICA, Role.CONDUCTOR)
  @ApiOperation({ summary: 'Get a maintenance record by ID' })
  @ApiResponse({ status: 200, description: 'Returns the maintenance record' })
  @ApiResponse({ status: 404, description: 'Maintenance not found' })
  findOne(@Param('id') id: string) {
    return this.maintenanceService.findOne(id);
  }

  @Patch(':id')
  @Roles(Role.ADMIN, Role.LOGISTICA)
  @ApiOperation({ summary: 'Update a maintenance record' })
  @ApiResponse({ status: 200, description: 'Maintenance updated successfully' })
  @ApiResponse({ status: 404, description: 'Maintenance not found' })
  update(
    @Param('id') id: string,
    @Body() updateMaintenanceDto: UpdateMaintenanceDto,
  ) {
    return this.maintenanceService.update(id, updateMaintenanceDto);
  }

  @Delete(':id')
  @Roles(Role.ADMIN)
  @ApiOperation({ summary: 'Delete a maintenance record (Admin only)' })
  @ApiResponse({ status: 200, description: 'Maintenance deleted successfully' })
  @ApiResponse({ status: 404, description: 'Maintenance not found' })
  remove(@Param('id') id: string) {
    return this.maintenanceService.remove(id);
  }
}
