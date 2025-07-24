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
      throw new BadRequestException(
        `Failed to create route point: ${error.message}`,
      );
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

  async findByRoute(scheduledRouteId: string): Promise<RoutePoint[]> {
    return this.routePointModel
      .find({ scheduledRouteId })
      .populate('scheduledRouteId', 'name origin destination')
      .sort({ sequenceOrder: 1 })
      .exec();
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
