import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import {
  RoutePoint,
  RoutePointDocument,
  PointType,
} from './entities/route-point.entity';
import {
  ScheduledRoute,
  ScheduledRouteDocument,
} from '../scheduled-route/entities/scheduled-route.entity';
import { MapsService } from '../maps/maps.service';

export interface CreateRoutePointDto {
  name: string;
  description?: string;
  type?: PointType;
  latitude: number;
  longitude: number;
  address?: string;
  sequenceOrder?: number;
  plannedArrivalTime?: Date;
  plannedDepartureTime?: Date;
  estimatedStayMinutes?: number;
  radiusMeters?: number;
  notes?: string;
  scheduledRouteId: string;
}

export interface UpdateRoutePointDto {
  name?: string;
  description?: string;
  type?: PointType;
  latitude?: number;
  longitude?: number;
  address?: string;
  sequenceOrder?: number;
  plannedArrivalTime?: Date;
  plannedDepartureTime?: Date;
  estimatedStayMinutes?: number;
  radiusMeters?: number;
  notes?: string;
  isCompleted?: boolean;
}

@Injectable()
export class RoutePointService {
  constructor(
    @InjectModel(RoutePoint.name)
    private routePointModel: Model<RoutePointDocument>,
    @InjectModel(ScheduledRoute.name)
    private scheduledRouteModel: Model<ScheduledRouteDocument>,
    private mapsService: MapsService,
  ) {}

  async create(createRoutePointDto: CreateRoutePointDto): Promise<RoutePoint> {
    try {
      // Validate scheduled route exists
      const route = await this.scheduledRouteModel.findById(
        createRoutePointDto.scheduledRouteId,
      );
      if (!route) {
        throw new NotFoundException('Scheduled route not found');
      }

      // If sequenceOrder is not provided, get the next available order
      if (!createRoutePointDto.sequenceOrder) {
        const maxOrder = await this.routePointModel
          .find({ scheduledRouteId: createRoutePointDto.scheduledRouteId })
          .sort({ sequenceOrder: -1 })
          .limit(1)
          .exec();

        createRoutePointDto.sequenceOrder =
          maxOrder.length > 0 ? maxOrder[0].sequenceOrder + 1 : 1;
      }

      // Validate coordinates
      if (
        createRoutePointDto.latitude < -90 ||
        createRoutePointDto.latitude > 90
      ) {
        throw new BadRequestException('Invalid latitude value');
      }
      if (
        createRoutePointDto.longitude < -180 ||
        createRoutePointDto.longitude > 180
      ) {
        throw new BadRequestException('Invalid longitude value');
      }

      const routePoint = new this.routePointModel(createRoutePointDto);
      return await routePoint.save();
    } catch (error) {
      if (
        error instanceof NotFoundException ||
        error instanceof BadRequestException
      ) {
        throw error;
      }
      throw new BadRequestException('Failed to create route point');
    }
  }

  async createWithDistance(
    createRoutePointDtos: CreateRoutePointDto[],
  ): Promise<{
    routePoints: RoutePoint[];
    drivingDistance: {
      routePolyline: string;
      decodedPath: Array<{ lat: number; lng: number }>;
      estimatedDistance: number;
      estimatedDistanceText: string;
      estimatedDuration: number;
      estimatedDurationText: string;
      routeSteps: Array<{
        instruction: string;
        distance: string;
        duration: string;
        startLocation: { lat: number; lng: number };
        endLocation: { lat: number; lng: number };
      }>;
      waypoints: string[];
    };
  }> {
    try {
      if (!createRoutePointDtos || createRoutePointDtos.length === 0) {
        throw new BadRequestException('No route points provided');
      }

      // Validate all scheduled routes exist and are the same
      const routeIds = [
        ...new Set(createRoutePointDtos.map((dto) => dto.scheduledRouteId)),
      ];
      if (routeIds.length > 1) {
        throw new BadRequestException(
          'All route points must belong to the same route',
        );
      }

      const routeId = routeIds[0];
      const route = await this.scheduledRouteModel.findById(routeId);
      if (!route) {
        throw new NotFoundException('Scheduled route not found');
      }

      // Validate coordinates for all points
      for (const dto of createRoutePointDtos) {
        if (dto.latitude < -90 || dto.latitude > 90) {
          throw new BadRequestException(
            `Invalid latitude value for point: ${dto.name}`,
          );
        }
        if (dto.longitude < -180 || dto.longitude > 180) {
          throw new BadRequestException(
            `Invalid longitude value for point: ${dto.name}`,
          );
        }
      }

      // If sequenceOrder is not provided for any point, calculate them
      const pointsWithSequence = createRoutePointDtos.map((dto, index) => {
        if (!dto.sequenceOrder) {
          dto.sequenceOrder = index + 1;
        }
        return dto;
      });

      // Create all route points
      const routePoints = pointsWithSequence.map(
        (dto) => new this.routePointModel(dto),
      );
      const savedRoutePoints =
        await this.routePointModel.insertMany(routePoints);

      // Calculate Google Maps driving distance
      const routePointsForMaps = savedRoutePoints.map((point) => ({
        latitude: point.latitude,
        longitude: point.longitude,
        type: point.type,
      }));

      const drivingDistance =
        await this.mapsService.calculateRouteFromPoints(routePointsForMaps);

      return {
        routePoints: savedRoutePoints,
        drivingDistance,
      };
    } catch (error) {
      if (
        error instanceof NotFoundException ||
        error instanceof BadRequestException
      ) {
        throw error;
      }
      throw new BadRequestException('Failed to create route points');
    }
  }

  async createBulk(
    createRoutePointDtos: CreateRoutePointDto[],
  ): Promise<RoutePoint[]> {
    try {
      if (!createRoutePointDtos || createRoutePointDtos.length === 0) {
        throw new BadRequestException('No route points provided');
      }

      // Validate all scheduled routes exist and are the same
      const routeIds = [
        ...new Set(createRoutePointDtos.map((dto) => dto.scheduledRouteId)),
      ];
      if (routeIds.length > 1) {
        throw new BadRequestException(
          'All route points must belong to the same route',
        );
      }

      const routeId = routeIds[0];
      const route = await this.scheduledRouteModel.findById(routeId);
      if (!route) {
        throw new NotFoundException('Scheduled route not found');
      }

      // Validate coordinates for all points
      for (const dto of createRoutePointDtos) {
        if (dto.latitude < -90 || dto.latitude > 90) {
          throw new BadRequestException(
            `Invalid latitude value for point: ${dto.name}`,
          );
        }
        if (dto.longitude < -180 || dto.longitude > 180) {
          throw new BadRequestException(
            `Invalid longitude value for point: ${dto.name}`,
          );
        }
      }

      // If sequenceOrder is not provided for any point, calculate them
      const pointsWithSequence = createRoutePointDtos.map((dto, index) => {
        if (!dto.sequenceOrder) {
          dto.sequenceOrder = index + 1;
        }
        return dto;
      });

      // Create all route points
      const routePoints = pointsWithSequence.map(
        (dto) => new this.routePointModel(dto),
      );
      const savedRoutePoints =
        await this.routePointModel.insertMany(routePoints);

      return savedRoutePoints;
    } catch (error) {
      if (
        error instanceof NotFoundException ||
        error instanceof BadRequestException
      ) {
        throw error;
      }
      throw new BadRequestException('Failed to create route points');
    }
  }

  async findAll(query: any = {}): Promise<RoutePoint[]> {
    const filter: any = {};

    if (query.scheduledRouteId) {
      filter.scheduledRouteId = query.scheduledRouteId;
    }

    if (query.type) {
      filter.type = query.type;
    }

    if (query.isCompleted === 'true') {
      filter.isCompleted = true;
    } else if (query.isCompleted === 'false') {
      filter.isCompleted = false;
    }

    return this.routePointModel
      .find(filter)
      .populate('scheduledRouteId', 'name origin destination')
      .sort({ sequenceOrder: 1 })
      .exec();
  }

  async findOne(id: string): Promise<RoutePoint> {
    const routePoint = await this.routePointModel
      .findById(id)
      .populate('scheduledRouteId', 'name origin destination')
      .exec();

    if (!routePoint) {
      throw new NotFoundException(`Route point with ID ${id} not found`);
    }

    return routePoint;
  }

  async update(
    id: string,
    updateRoutePointDto: UpdateRoutePointDto,
  ): Promise<RoutePoint> {
    // Validate coordinates if provided
    if (updateRoutePointDto.latitude !== undefined) {
      if (
        updateRoutePointDto.latitude < -90 ||
        updateRoutePointDto.latitude > 90
      ) {
        throw new BadRequestException('Invalid latitude value');
      }
    }
    if (updateRoutePointDto.longitude !== undefined) {
      if (
        updateRoutePointDto.longitude < -180 ||
        updateRoutePointDto.longitude > 180
      ) {
        throw new BadRequestException('Invalid longitude value');
      }
    }

    const routePoint = await this.routePointModel
      .findByIdAndUpdate(id, updateRoutePointDto, { new: true })
      .populate('scheduledRouteId', 'name origin destination')
      .exec();

    if (!routePoint) {
      throw new NotFoundException(`Route point with ID ${id} not found`);
    }

    return routePoint;
  }

  async remove(id: string): Promise<void> {
    const result = await this.routePointModel.findByIdAndDelete(id).exec();
    if (!result) {
      throw new NotFoundException(`Route point with ID ${id} not found`);
    }
  }

  async updateWithDistanceRecalculation(
    id: string,
    updateRoutePointDto: UpdateRoutePointDto,
  ): Promise<{
    routePoint: RoutePoint;
    drivingDistance: {
      routePolyline: string;
      decodedPath: Array<{ lat: number; lng: number }>;
      estimatedDistance: number;
      estimatedDistanceText: string;
      estimatedDuration: number;
      estimatedDurationText: string;
      routeSteps: Array<{
        instruction: string;
        distance: string;
        duration: string;
        startLocation: { lat: number; lng: number };
        endLocation: { lat: number; lng: number };
      }>;
      waypoints: string[];
    };
  }> {
    try {
      // First get the route point to know which route it belongs to
      const existingRoutePoint = await this.routePointModel.findById(id);
      if (!existingRoutePoint) {
        throw new NotFoundException('Route point not found');
      }

      // Validate coordinates if they are being updated
      if (updateRoutePointDto.latitude !== undefined) {
        if (
          updateRoutePointDto.latitude < -90 ||
          updateRoutePointDto.latitude > 90
        ) {
          throw new BadRequestException('Invalid latitude value');
        }
      }
      if (updateRoutePointDto.longitude !== undefined) {
        if (
          updateRoutePointDto.longitude < -180 ||
          updateRoutePointDto.longitude > 180
        ) {
          throw new BadRequestException('Invalid longitude value');
        }
      }

      // Update the route point
      const updatedRoutePoint = await this.routePointModel
        .findByIdAndUpdate(id, updateRoutePointDto, { new: true })
        .populate('scheduledRouteId', 'name origin destination')
        .exec();

      if (!updatedRoutePoint) {
        throw new NotFoundException('Route point not found after update');
      }

      // Recalculate driving distance for the entire route
      const allRoutePoints = await this.routePointModel
        .find({ scheduledRouteId: existingRoutePoint.scheduledRouteId })
        .sort({ sequenceOrder: 1 })
        .exec();

      const routePointsForMaps = allRoutePoints.map((point) => ({
        latitude: point.latitude,
        longitude: point.longitude,
        type: point.type,
      }));

      const drivingDistance =
        await this.mapsService.calculateRouteFromPoints(routePointsForMaps);

      return {
        routePoint: updatedRoutePoint,
        drivingDistance,
      };
    } catch (error) {
      if (
        error instanceof NotFoundException ||
        error instanceof BadRequestException
      ) {
        throw error;
      }
      throw new BadRequestException('Failed to update route point');
    }
  }

  async removeWithDistanceRecalculation(id: string): Promise<{
    drivingDistance: {
      routePolyline: string;
      decodedPath: Array<{ lat: number; lng: number }>;
      estimatedDistance: number;
      estimatedDistanceText: string;
      estimatedDuration: number;
      estimatedDurationText: string;
      routeSteps: Array<{
        instruction: string;
        distance: string;
        duration: string;
        startLocation: { lat: number; lng: number };
        endLocation: { lat: number; lng: number };
      }>;
      waypoints: string[];
    };
  }> {
    try {
      // First get the route point to know which route it belongs to
      const existingRoutePoint = await this.routePointModel.findById(id);
      if (!existingRoutePoint) {
        throw new NotFoundException('Route point not found');
      }

      const routeId = existingRoutePoint.scheduledRouteId;

      // Delete the route point
      const result = await this.routePointModel.findByIdAndDelete(id).exec();
      if (!result) {
        throw new NotFoundException(`Route point with ID ${id} not found`);
      }

      // Get remaining route points and recalculate driving distance
      const remainingRoutePoints = await this.routePointModel
        .find({ scheduledRouteId: routeId })
        .sort({ sequenceOrder: 1 })
        .exec();

      if (remainingRoutePoints.length === 0) {
        // No points left, return empty distance
        return {
          drivingDistance: {
            routePolyline: '',
            decodedPath: [],
            estimatedDistance: 0,
            estimatedDistanceText: '0 km',
            estimatedDuration: 0,
            estimatedDurationText: '0 mins',
            routeSteps: [],
            waypoints: [],
          },
        };
      }

      const routePointsForMaps = remainingRoutePoints.map((point) => ({
        latitude: point.latitude,
        longitude: point.longitude,
        type: point.type,
      }));

      const drivingDistance =
        await this.mapsService.calculateRouteFromPoints(routePointsForMaps);

      return {
        drivingDistance,
      };
    } catch (error) {
      if (
        error instanceof NotFoundException ||
        error instanceof BadRequestException
      ) {
        throw error;
      }
      throw new BadRequestException('Failed to delete route point');
    }
  }

  async findByRoute(scheduledRouteId: string): Promise<RoutePoint[]> {
    return this.routePointModel
      .find({ scheduledRouteId })
      .populate('scheduledRouteId', 'name origin destination')
      .sort({ sequenceOrder: 1 })
      .exec();
  }

  async reorderPointsWithDistanceRecalculation(
    scheduledRouteId: string,
    pointIds: string[],
  ): Promise<{
    routePoints: RoutePoint[];
    drivingDistance: {
      routePolyline: string;
      decodedPath: Array<{ lat: number; lng: number }>;
      estimatedDistance: number;
      estimatedDistanceText: string;
      estimatedDuration: number;
      estimatedDurationText: string;
      routeSteps: Array<{
        instruction: string;
        distance: string;
        duration: string;
        startLocation: { lat: number; lng: number };
        endLocation: { lat: number; lng: number };
      }>;
      waypoints: string[];
    };
  }> {
    try {
      // Validate all points belong to the same route
      const points = await this.routePointModel
        .find({ _id: { $in: pointIds }, scheduledRouteId })
        .exec();

      if (points.length !== pointIds.length) {
        throw new BadRequestException(
          'Some points do not belong to the specified route',
        );
      }

      // Update sequence order for each point
      const updatePromises = pointIds.map((pointId, index) => {
        return this.routePointModel.findByIdAndUpdate(
          pointId,
          { sequenceOrder: index + 1 },
          { new: true },
        );
      });

      await Promise.all(updatePromises);

      // Get points in new order
      const reorderedPoints = await this.routePointModel
        .find({ scheduledRouteId })
        .populate('scheduledRouteId', 'name origin destination')
        .sort({ sequenceOrder: 1 })
        .exec();

      // Recalculate driving distance with new order
      const routePointsForMaps = reorderedPoints.map((point) => ({
        latitude: point.latitude,
        longitude: point.longitude,
        type: point.type,
      }));

      const drivingDistance =
        await this.mapsService.calculateRouteFromPoints(routePointsForMaps);

      return {
        routePoints: reorderedPoints,
        drivingDistance,
      };
    } catch (error) {
      if (
        error instanceof NotFoundException ||
        error instanceof BadRequestException
      ) {
        throw error;
      }
      throw new BadRequestException('Failed to reorder route points');
    }
  }

  async reorderPoints(
    scheduledRouteId: string,
    pointIds: string[],
  ): Promise<RoutePoint[]> {
    // Validate all points belong to the same route
    const points = await this.routePointModel
      .find({ _id: { $in: pointIds }, scheduledRouteId })
      .exec();

    if (points.length !== pointIds.length) {
      throw new BadRequestException(
        'Some points do not belong to the specified route',
      );
    }

    // Update sequence order for each point
    const updatePromises = pointIds.map((pointId, index) => {
      return this.routePointModel.findByIdAndUpdate(
        pointId,
        { sequenceOrder: index + 1 },
        { new: true },
      );
    });

    const updatedPoints = await Promise.all(updatePromises);

    // Return points in new order
    return this.routePointModel
      .find({ scheduledRouteId })
      .populate('scheduledRouteId', 'name origin destination')
      .sort({ sequenceOrder: 1 })
      .exec();
  }

  async markAsCompleted(id: string): Promise<RoutePoint> {
    const routePoint = await this.routePointModel
      .findByIdAndUpdate(
        id,
        {
          isCompleted: true,
          actualArrivalTime: new Date(),
        },
        { new: true },
      )
      .populate('scheduledRouteId', 'name origin destination')
      .exec();

    if (!routePoint) {
      throw new NotFoundException(`Route point with ID ${id} not found`);
    }

    return routePoint;
  }

  async getRouteSummary(scheduledRouteId: string): Promise<any> {
    const points = await this.routePointModel
      .find({ scheduledRouteId })
      .sort({ sequenceOrder: 1 })
      .exec();

    const totalPoints = points.length;
    const completedPoints = points.filter((p) => p.isCompleted).length;
    const originPoint = points.find((p) => p.type === PointType.ORIGEN);
    const destinationPoint = points.find((p) => p.type === PointType.DESTINO);
    const waypoints = points.filter(
      (p) => p.type === PointType.PARADA || p.type === PointType.CHECKPOINT,
    );

    return {
      totalPoints,
      completedPoints,
      completionPercentage:
        totalPoints > 0 ? (completedPoints / totalPoints) * 100 : 0,
      origin: originPoint
        ? {
            name: originPoint.name,
            coordinates: {
              lat: originPoint.latitude,
              lng: originPoint.longitude,
            },
            isCompleted: originPoint.isCompleted,
          }
        : null,
      destination: destinationPoint
        ? {
            name: destinationPoint.name,
            coordinates: {
              lat: destinationPoint.latitude,
              lng: destinationPoint.longitude,
            },
            isCompleted: destinationPoint.isCompleted,
          }
        : null,
      waypoints: waypoints.map((wp) => ({
        name: wp.name,
        type: wp.type,
        coordinates: { lat: wp.latitude, lng: wp.longitude },
        isCompleted: wp.isCompleted,
        sequenceOrder: wp.sequenceOrder,
      })),
    };
  }

  async findNearbyPoints(
    latitude: number,
    longitude: number,
    radiusMeters: number = 1000,
  ): Promise<RoutePoint[]> {
    // Simple distance calculation (for production, consider using MongoDB geospatial queries)
    const points = await this.routePointModel
      .find()
      .populate('scheduledRouteId', 'name origin destination')
      .exec();

    const nearbyPoints = points.filter((point) => {
      const distance = this.calculateDistance(
        latitude,
        longitude,
        point.latitude,
        point.longitude,
      );
      return distance <= radiusMeters;
    });

    return nearbyPoints.sort((a, b) => {
      const distanceA = this.calculateDistance(
        latitude,
        longitude,
        a.latitude,
        a.longitude,
      );
      const distanceB = this.calculateDistance(
        latitude,
        longitude,
        b.latitude,
        b.longitude,
      );
      return distanceA - distanceB;
    });
  }

  private calculateDistance(
    lat1: number,
    lon1: number,
    lat2: number,
    lon2: number,
  ): number {
    const R = 6371e3; // Earth's radius in meters
    const φ1 = (lat1 * Math.PI) / 180;
    const φ2 = (lat2 * Math.PI) / 180;
    const Δφ = ((lat2 - lat1) * Math.PI) / 180;
    const Δλ = ((lon2 - lon1) * Math.PI) / 180;

    const a =
      Math.sin(Δφ / 2) * Math.sin(Δφ / 2) +
      Math.cos(φ1) * Math.cos(φ2) * Math.sin(Δλ / 2) * Math.sin(Δλ / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

    return R * c;
  }
}
