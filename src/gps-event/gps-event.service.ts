import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { GpsEvent, GpsEventDocument } from './entities/gps-event.entity';
import {
  RoutePoint,
  RoutePointDocument,
} from '../route-point/entities/route-point.entity';
import {
  ScheduledRoute,
  ScheduledRouteDocument,
} from '../scheduled-route/entities/scheduled-route.entity';
import { Vehicle, VehicleDocument } from '../vehicle/entities/vehicle.entity';
import { User, UserDocument } from '../users/entities/user.entity';
import {
  calculateHaversineDistance,
  checkRouteProximity,
  Coordinate,
} from '../utils/haversine.util';
import { EventType, AlertSeverity } from './entities/gps-event.entity';

export interface CreateGpsEventDto {
  vehicleId: string;
  scheduledRouteId?: string;
  latitude: number;
  longitude: number;
  timestamp?: Date;
  speed?: number;
  heading?: number;
  altitude?: number;
  satellites?: number;
  accuracy?: number;
  eventType?: EventType;
  eventData?: any;
  message?: string;
}

@Injectable()
export class GpsEventService {
  constructor(
    @InjectModel(GpsEvent.name)
    private gpsEventModel: Model<GpsEventDocument>,
    @InjectModel(RoutePoint.name)
    private routePointModel: Model<RoutePointDocument>,
    @InjectModel(ScheduledRoute.name)
    private scheduledRouteModel: Model<ScheduledRouteDocument>,
    @InjectModel(Vehicle.name)
    private vehicleModel: Model<VehicleDocument>,
    @InjectModel(User.name)
    private userModel: Model<UserDocument>,
  ) {}

  async create(
    createGpsEventDto: CreateGpsEventDto,
    driverId: string,
  ): Promise<GpsEvent> {
    try {
      // Validate vehicle exists
      const vehicle = await this.vehicleModel.findById(
        createGpsEventDto.vehicleId,
      );
      if (!vehicle) {
        throw new NotFoundException('Vehicle not found');
      }

      // Validate driver exists
      const driver = await this.userModel.findById(driverId);
      if (!driver) {
        throw new NotFoundException('Driver not found');
      }

      // Check if driver is assigned to this vehicle
      if (vehicle.assignedDriverId?.toString() !== driverId) {
        throw new BadRequestException('Driver is not assigned to this vehicle');
      }

      // Process GPS event and check for route deviation
      const processedEvent = await this.processGpsEvent(
        createGpsEventDto,
        driverId,
      );

      // Create the GPS event
      const gpsEvent = new this.gpsEventModel(processedEvent);
      return await gpsEvent.save();
    } catch (error) {
      if (
        error instanceof NotFoundException ||
        error instanceof BadRequestException
      ) {
        throw error;
      }
      throw new BadRequestException(
        `Failed to create GPS event: ${error.message}`,
      );
    }
  }

  private async processGpsEvent(
    createGpsEventDto: CreateGpsEventDto,
    driverId: string,
  ): Promise<any> {
    const gpsPoint: Coordinate = {
      latitude: createGpsEventDto.latitude,
      longitude: createGpsEventDto.longitude,
    };

    let isDeviation = false;
    let closestDistance = Infinity;
    let closestSegment = -1;
    let routePoints: any[] = [];

    // Check route deviation if scheduledRouteId is provided
    if (createGpsEventDto.scheduledRouteId) {
      const route = await this.scheduledRouteModel.findById(
        createGpsEventDto.scheduledRouteId,
      );
      if (route) {
        // Get route points ordered by sequence
        routePoints = await this.routePointModel
          .find({ scheduledRouteId: createGpsEventDto.scheduledRouteId })
          .sort({ sequenceOrder: 1 })
          .exec();

        if (routePoints.length >= 2) {
          // Check if GPS point is within 500m of the route
          const proximityCheck = checkRouteProximity(
            gpsPoint,
            routePoints,
            500,
          );

          isDeviation = !proximityCheck.isOnRoute;
          closestDistance = proximityCheck.closestDistance;
          closestSegment = proximityCheck.closestSegment;
        }
      }
    }

    // Determine event type based on deviation
    let eventType = createGpsEventDto.eventType || EventType.LOCATION;
    let severity = AlertSeverity.LOW;
    let message = createGpsEventDto.message;

    if (isDeviation) {
      eventType = EventType.ROUTE_DEVIATION;
      severity = AlertSeverity.HIGH;
      message = `Vehicle deviated from planned route. Distance from route: ${Math.round(closestDistance)}m`;
    }

    // Build flexible event data
    const eventData = {
      coordinates: {
        lat: gpsPoint.latitude,
        lng: gpsPoint.longitude,
      },
      speed: createGpsEventDto.speed,
      route: {
        plannedDistance:
          routePoints.length >= 2
            ? this.calculateRouteDistance(routePoints)
            : 0,
        deviation: isDeviation ? closestDistance : 0,
        closestSegment,
      },
      driver: {
        id: driverId,
        isActive: true,
      },
      ...createGpsEventDto.eventData,
    };

    return {
      eventType,
      timestamp: createGpsEventDto.timestamp || new Date(),
      latitude: gpsPoint.latitude,
      longitude: gpsPoint.longitude,
      speed: createGpsEventDto.speed,
      heading: createGpsEventDto.heading,
      altitude: createGpsEventDto.altitude,
      satellites: createGpsEventDto.satellites,
      accuracy: createGpsEventDto.accuracy,
      severity,
      message,
      eventData,
      isProcessed: true,
      isAlert: isDeviation,
      isAcknowledged: false,
      vehicleId: createGpsEventDto.vehicleId,
      scheduledRouteId: createGpsEventDto.scheduledRouteId,
    };
  }

  private calculateRouteDistance(routePoints: any[]): number {
    if (routePoints.length < 2) return 0;

    let totalDistance = 0;
    for (let i = 0; i < routePoints.length - 1; i++) {
      const current = routePoints[i];
      const next = routePoints[i + 1];
      totalDistance += calculateHaversineDistance(
        { latitude: current.latitude, longitude: current.longitude },
        { latitude: next.latitude, longitude: next.longitude },
      );
    }
    return totalDistance;
  }

  async findAll(query: any = {}): Promise<GpsEvent[]> {
    const filter: any = {};

    if (query.vehicleId) {
      filter.vehicleId = query.vehicleId;
    }

    if (query.scheduledRouteId) {
      filter.scheduledRouteId = query.scheduledRouteId;
    }

    if (query.eventType) {
      filter.eventType = query.eventType;
    }

    if (query.isAlert === 'true') {
      filter.isAlert = true;
    }

    if (query.isDeviation === 'true') {
      filter.eventType = EventType.ROUTE_DEVIATION;
    }

    if (query.startDate && query.endDate) {
      filter.timestamp = {
        $gte: new Date(query.startDate),
        $lte: new Date(query.endDate),
      };
    }

    return this.gpsEventModel
      .find(filter)
      .populate('vehicleId', 'plateNumber brand model')
      .populate('scheduledRouteId', 'name origin destination')
      .sort({ timestamp: -1 })
      .exec();
  }

  async findOne(id: string): Promise<GpsEvent> {
    const gpsEvent = await this.gpsEventModel
      .findById(id)
      .populate('vehicleId', 'plateNumber brand model')
      .populate('scheduledRouteId', 'name origin destination')
      .exec();

    if (!gpsEvent) {
      throw new NotFoundException(`GPS event with ID ${id} not found`);
    }

    return gpsEvent;
  }

  async findByVehicle(
    vehicleId: string,
    limit: number = 100,
  ): Promise<GpsEvent[]> {
    return this.gpsEventModel
      .find({ vehicleId })
      .populate('scheduledRouteId', 'name origin destination')
      .sort({ timestamp: -1 })
      .limit(limit)
      .exec();
  }

  async findByRoute(scheduledRouteId: string): Promise<GpsEvent[]> {
    return this.gpsEventModel
      .find({ scheduledRouteId })
      .populate('vehicleId', 'plateNumber brand model')
      .sort({ timestamp: -1 })
      .exec();
  }

  async findDeviations(
    vehicleId?: string,
    startDate?: Date,
    endDate?: Date,
  ): Promise<GpsEvent[]> {
    const filter: any = { eventType: EventType.ROUTE_DEVIATION };

    if (vehicleId) {
      filter.vehicleId = vehicleId;
    }

    if (startDate && endDate) {
      filter.timestamp = { $gte: startDate, $lte: endDate };
    }

    return this.gpsEventModel
      .find(filter)
      .populate('vehicleId', 'plateNumber brand model')
      .populate('scheduledRouteId', 'name origin destination')
      .sort({ timestamp: -1 })
      .exec();
  }

  async acknowledgeAlert(id: string): Promise<GpsEvent> {
    const gpsEvent = await this.gpsEventModel
      .findByIdAndUpdate(id, { isAcknowledged: true }, { new: true })
      .populate('vehicleId', 'plateNumber brand model')
      .populate('scheduledRouteId', 'name origin destination')
      .exec();

    if (!gpsEvent) {
      throw new NotFoundException(`GPS event with ID ${id} not found`);
    }

    return gpsEvent;
  }

  async getVehicleCurrentLocation(vehicleId: string): Promise<GpsEvent | null> {
    return this.gpsEventModel
      .findOne({ vehicleId })
      .sort({ timestamp: -1 })
      .populate('scheduledRouteId', 'name origin destination')
      .exec();
  }

  async getRouteAnalytics(scheduledRouteId: string): Promise<any> {
    const events = await this.gpsEventModel
      .find({ scheduledRouteId })
      .sort({ timestamp: 1 })
      .exec();

    const totalEvents = events.length;
    const deviations = events.filter(
      (e) => e.eventType === EventType.ROUTE_DEVIATION,
    ).length;
    const alerts = events.filter((e) => e.isAlert).length;

    let totalDistance = 0;
    let maxSpeed = 0;
    let avgSpeed = 0;

    if (events.length > 0) {
      // Calculate total distance from GPS points
      for (let i = 1; i < events.length; i++) {
        const distance = calculateHaversineDistance(
          {
            latitude: events[i - 1].latitude,
            longitude: events[i - 1].longitude,
          },
          { latitude: events[i].latitude, longitude: events[i].longitude },
        );
        totalDistance += distance;
      }

      // Calculate speed statistics
      const speeds = events.filter((e) => e.speed !== undefined).map((e) => e.speed!);
      if (speeds.length > 0) {
        maxSpeed = Math.max(...speeds);
        avgSpeed = speeds.reduce((a, b) => a + b, 0) / speeds.length;
      }
    }

    return {
      totalEvents,
      deviations,
      alerts,
      totalDistance: Math.round(totalDistance),
      maxSpeed: Math.round(maxSpeed),
      avgSpeed: Math.round(avgSpeed),
      deviationPercentage:
        totalEvents > 0 ? (deviations / totalEvents) * 100 : 0,
    };
  }
}
