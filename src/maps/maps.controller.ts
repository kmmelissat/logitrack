import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { MapsService } from './maps.service';
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

@ApiTags('maps')
@ApiBearerAuth()
@Controller('maps')
@UseGuards(JwtAuthGuard, RolesGuard)
export class MapsController {
  constructor(private readonly mapsService: MapsService) {}

  @Get('distance')
  @Roles(Role.ADMIN, Role.LOGISTICA)
  @ApiOperation({ summary: 'Calculate distance between two points' })
  @ApiResponse({ status: 200, description: 'Returns distance and duration' })
  @ApiQuery({
    name: 'origin',
    description: 'Starting point (address or coordinates)',
  })
  @ApiQuery({
    name: 'destination',
    description: 'Ending point (address or coordinates)',
  })
  async getDistance(
    @Query('origin') origin: string,
    @Query('destination') destination: string,
  ) {
    return this.mapsService.calculateDistance(origin, destination);
  }

  @Get('directions')
  @Roles(Role.ADMIN, Role.LOGISTICA, Role.CONDUCTOR)
  @ApiOperation({ summary: 'Get directions between points' })
  @ApiResponse({ status: 200, description: 'Returns route information' })
  @ApiQuery({
    name: 'origin',
    description: 'Starting point (address or coordinates)',
  })
  @ApiQuery({
    name: 'destination',
    description: 'Ending point (address or coordinates)',
  })
  @ApiQuery({
    name: 'waypoints',
    required: false,
    description: 'Intermediate points separated by |',
  })
  async getDirections(
    @Query('origin') origin: string,
    @Query('destination') destination: string,
    @Query('waypoints') waypoints?: string,
  ) {
    const waypointArray = waypoints ? waypoints.split('|') : undefined;
    return this.mapsService.getDirections(origin, destination, waypointArray);
  }

  @Get('geocode')
  @Roles(Role.ADMIN, Role.LOGISTICA)
  @ApiOperation({ summary: 'Geocode an address' })
  @ApiResponse({ status: 200, description: 'Returns geocoded location' })
  @ApiQuery({ name: 'address', description: 'Address to geocode' })
  async geocode(@Query('address') address: string) {
    return this.mapsService.geocode(address);
  }

  @Get('route/complete')
  @Roles(Role.ADMIN, Role.LOGISTICA, Role.CONDUCTOR)
  @ApiOperation({ summary: 'Calculate complete route with polyline and steps' })
  @ApiResponse({
    status: 200,
    description:
      'Returns complete route with polyline, decoded path, and turn-by-turn directions',
    schema: {
      type: 'object',
      properties: {
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
      },
    },
  })
  @ApiQuery({
    name: 'origin',
    description: 'Starting point (address or coordinates)',
  })
  @ApiQuery({
    name: 'destination',
    description: 'Ending point (address or coordinates)',
  })
  @ApiQuery({
    name: 'waypoints',
    required: false,
    description: 'Intermediate points separated by |',
  })
  async getCompleteRoute(
    @Query('origin') origin: string,
    @Query('destination') destination: string,
    @Query('waypoints') waypoints?: string,
  ) {
    const waypointArray = waypoints ? waypoints.split('|') : undefined;
    return this.mapsService.calculateCompleteRoute(
      origin,
      destination,
      waypointArray,
    );
  }
}
