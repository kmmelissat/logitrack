import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  Query,
  UseGuards,
  Patch,
  Delete,
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
  RoutePointService,
  CreateRoutePointDto,
  UpdateRoutePointDto,
} from './route-point.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { Role } from '../auth/enums/role.enum';
import { PointType } from './entities/route-point.entity';
import { ScheduledRouteService } from '../scheduled-route/scheduled-route.service';

@ApiTags('route-points')
@Controller('route-points')
@UseGuards(JwtAuthGuard, RolesGuard)
@ApiBearerAuth()
export class RoutePointController {
  constructor(
    private readonly routePointService: RoutePointService,
    private readonly scheduledRouteService: ScheduledRouteService,
  ) {}

  @Post()
  @Roles(Role.ADMIN, Role.LOGISTICA)
  @ApiOperation({
    summary: 'Create route points for a route (bulk)',
    description:
      'Create multiple route points for a scheduled route and calculate Google Maps driving distance',
  })
  @ApiBody({
    description: 'Array of route points data',
    examples: {
      completeRoute: {
        summary: 'Complete route with origin, stops, and destination',
        value: [
          {
            name: 'Terminal San Salvador',
            description: 'Starting point of the route',
            type: 'origen',
            latitude: 13.6929,
            longitude: -89.2182,
            address: 'Terminal de Buses San Salvador',
            sequenceOrder: 1,
            scheduledRouteId: '507f1f77bcf86cd799439011',
          },
          {
            name: 'Santa Ana',
            description: 'Intermediate stop for cargo pickup',
            type: 'parada',
            latitude: 13.9947,
            longitude: -89.5597,
            address: 'Centro de Santa Ana',
            sequenceOrder: 2,
            estimatedStayMinutes: 30,
            radiusMeters: 500,
            scheduledRouteId: '507f1f77bcf86cd799439011',
          },
          {
            name: 'Terminal Tegucigalpa',
            description: 'Final destination of the route',
            type: 'destino',
            latitude: 14.0723,
            longitude: -87.1921,
            address: 'Terminal de Buses Tegucigalpa',
            sequenceOrder: 3,
            scheduledRouteId: '507f1f77bcf86cd799439011',
          },
        ],
      },
    },
  })
  @ApiResponse({
    status: 201,
    description: 'Route points created successfully with driving distance',
  })
  @ApiResponse({ status: 400, description: 'Invalid data or coordinates' })
  @ApiResponse({ status: 404, description: 'Scheduled route not found' })
  async create(@Body() createRoutePointDtos: CreateRoutePointDto[]) {
    return this.routePointService.createWithDistance(createRoutePointDtos);
  }

  @Get()
  @Roles(Role.ADMIN, Role.LOGISTICA, Role.CONDUCTOR)
  @ApiOperation({
    summary: 'Get all route points',
    description:
      'Retrieve all route points with optional filtering and save calculated route data to scheduled routes',
  })
  @ApiQuery({
    name: 'scheduledRouteId',
    required: false,
    description: 'Filter by scheduled route ID',
  })
  @ApiResponse({
    status: 200,
    description: 'Route points retrieved successfully',
  })
  async findAll(@Query() query: any) {
    console.log(`=== RoutePoints findAll called with query:`, query);

    const routePoints = await this.routePointService.findAll(query);
    console.log(`=== Found ${routePoints.length} route points`);

    // If we have route points and they belong to a scheduled route, save the calculated data
    if (routePoints && routePoints.length > 0) {
      // Group route points by scheduledRouteId
      const routePointsByRoute: { [key: string]: any[] } = routePoints.reduce(
        (acc: { [key: string]: any[] }, point) => {
          // Handle both populated and non-populated scheduledRouteId
          let routeId;
          if (
            typeof point.scheduledRouteId === 'object' &&
            point.scheduledRouteId?._id
          ) {
            // Populated object - extract the _id
            routeId = point.scheduledRouteId._id.toString();
            console.log(
              `=== Extracted routeId from populated object: ${routeId}`,
            );
          } else if (typeof point.scheduledRouteId === 'string') {
            // String ID
            routeId = point.scheduledRouteId;
            console.log(`=== Using string routeId: ${routeId}`);
          } else if (point.scheduledRouteId) {
            // ObjectId or other type
            routeId = point.scheduledRouteId.toString();
            console.log(`=== Converted routeId to string: ${routeId}`);
          }

          if (routeId) {
            if (!acc[routeId]) {
              acc[routeId] = [];
            }
            acc[routeId].push(point);
          } else {
            console.log(`=== No routeId found for point:`, point._id);
          }
          return acc;
        },
        {},
      );

      console.log(`=== Grouped routes:`, Object.keys(routePointsByRoute));

      // Save calculated data for each route
      for (const [routeId, points] of Object.entries(routePointsByRoute)) {
        console.log(
          `=== Processing route ${routeId} with ${points.length} points`,
        );
        if (points.length > 1) {
          // Only calculate if we have multiple points
          try {
            console.log(`=== Saving calculated data for route: ${routeId} ===`);
            const result =
              await this.scheduledRouteService.calculateAndUpdateRoute(routeId);
            console.log(
              `=== Successfully saved data for route: ${routeId} ===`,
            );
            console.log(`=== Saved route name: ${result.name}`);
            console.log(`=== Has polyline: ${!!result.routePolyline}`);
            console.log(`=== Has decoded path: ${!!result.decodedPath}`);
            console.log(`=== Has route steps: ${!!result.routeSteps}`);
            console.log(`=== Has waypoints: ${!!result.waypoints}`);
          } catch (error) {
            console.error(
              `=== Error saving data for route ${routeId}:`,
              error.message,
            );
            console.error(`=== Error stack:`, error.stack);
          }
        } else {
          console.log(
            `=== Skipping route ${routeId} - only ${points.length} point(s)`,
          );
        }
      }
    } else {
      console.log(`=== No route points found`);
    }

    return routePoints;
  }

  @Get(':id')
  @Roles(Role.ADMIN, Role.LOGISTICA, Role.CONDUCTOR)
  @ApiOperation({
    summary: 'Get route point by ID',
    description: 'Retrieve a specific route point by its ID',
  })
  @ApiResponse({
    status: 200,
    description: 'Route point retrieved successfully',
  })
  @ApiResponse({ status: 404, description: 'Route point not found' })
  async findOne(@Param('id') id: string) {
    return this.routePointService.findOne(id);
  }

  @Patch(':id')
  @Roles(Role.ADMIN, Role.LOGISTICA)
  @ApiOperation({
    summary: 'Update route point',
    description: 'Update a specific route point (Admin/Logistics only)',
  })
  @ApiBody({
    description: 'Route point update data',
    examples: {
      basic: {
        summary: 'Basic update',
        value: {
          name: 'Updated Point Name',
          description: 'Updated description',
          notes: 'Updated notes',
        },
      },
      coordinates: {
        summary: 'Update coordinates',
        value: {
          latitude: 13.7,
          longitude: -89.2,
          address: 'New address',
        },
      },
      timing: {
        summary: 'Update timing',
        value: {
          plannedArrivalTime: '2024-01-15T08:00:00Z',
          plannedDepartureTime: '2024-01-15T08:30:00Z',
          estimatedStayMinutes: 30,
        },
      },
    },
  })
  @ApiResponse({
    status: 200,
    description:
      'Route point updated successfully with recalculated driving distance',
  })
  @ApiResponse({ status: 400, description: 'Invalid data or coordinates' })
  @ApiResponse({ status: 404, description: 'Route point not found' })
  async update(
    @Param('id') id: string,
    @Body() updateRoutePointDto: UpdateRoutePointDto,
  ) {
    return this.routePointService.updateWithDistanceRecalculation(
      id,
      updateRoutePointDto,
    );
  }

  @Delete(':id')
  @Roles(Role.ADMIN, Role.LOGISTICA)
  @ApiOperation({
    summary: 'Delete route point',
    description: 'Delete a specific route point (Admin/Logistics only)',
  })
  @ApiResponse({
    status: 200,
    description:
      'Route point deleted successfully with recalculated driving distance',
  })
  @ApiResponse({ status: 404, description: 'Route point not found' })
  async remove(@Param('id') id: string) {
    return this.routePointService.removeWithDistanceRecalculation(id);
  }
}
