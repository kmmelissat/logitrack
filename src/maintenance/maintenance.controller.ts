import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
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

  @Get('/vehicles/:id/maintenance')
  @Roles(Role.ADMIN, Role.LOGISTICA, Role.CONDUCTOR)
  @ApiOperation({ summary: 'View maintenance history by vehicle' })
  @ApiResponse({ status: 200, description: 'Vehicle maintenance history' })
  @ApiResponse({ status: 404, description: 'Vehicle or maintenance not found' })
  getMaintenanceByVehicle(@Param('id') id: string) {
    return this.maintenanceService.findByVehicle(+id);
  }

  @Post('/vehicles/:id/maintenance')
  @Roles(Role.ADMIN, Role.LOGISTICA)
  @ApiOperation({ summary: 'Register new maintenance for a vehicle' })
  @ApiResponse({ status: 201, description: 'Maintenance successfully created for the vehicle' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 403, description: 'Forbidden' })
  createMaintenanceForVehicle(
    @Param('id') id: string,
    @Body() createMaintenanceDto: CreateMaintenanceDto,
  ) {
    return this.maintenanceService.create({ ...createMaintenanceDto, vehicleId: +id });
  }

  @Get(':id')
  @Roles(Role.ADMIN, Role.LOGISTICA, Role.CONDUCTOR)
  @ApiOperation({ summary: 'View maintenance details' })
  @ApiResponse({ status: 200, description: 'Maintenance details' })
  @ApiResponse({ status: 404, description: 'Maintenance not found' })
  findOne(@Param('id') id: string) {
    return this.maintenanceService.findOne(+id);
  }

  @Patch(':id')
  @Roles(Role.ADMIN, Role.LOGISTICA)
  @ApiOperation({ summary: 'Update a maintenance record' })
  @ApiResponse({ status: 200, description: 'Maintenance successfully updated' })
  @ApiResponse({ status: 404, description: 'Maintenance not found' })
  update(
    @Param('id') id: string,
    @Body() updateMaintenanceDto: UpdateMaintenanceDto,
  ) {
    return this.maintenanceService.update(+id, updateMaintenanceDto);
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
}
