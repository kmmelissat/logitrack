  import { Injectable, Logger } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { GpsEvent, GpsEventDocument } from './entities/gps-event.entity';
import {
  ScheduledRoute,
  ScheduledRouteDocument,
} from '../scheduled-route/entities/scheduled-route.entity';
import { Vehicle, VehicleDocument } from '../vehicle/entities/vehicle.entity';
import { User, UserDocument } from '../users/entities/user.entity';
import {
  calculateHaversineDistance,
  checkRouteProximity,
} from '../utils/haversine.util';
import { EventType, AlertSeverity } from './entities/gps-event.entity';

export interface SimulatedDriver {
  driverId: string;
  vehicleId: string;
  scheduledRouteId: string;
  currentPosition: {
    lat: number;
    lng: number;
  };
  currentSpeed: number;
  isActive: boolean;
  startTime: Date;
  lastUpdate: Date;
  progress: number; // 0-100 percentage of route completion
  deviations: number;
  alerts: any[];
}

export interface RouteMonitoringData {
  driverId: string;
  vehicleId: string;
  scheduledRouteId: string;
  currentLocation: {
    lat: number;
    lng: number;
  };
  routeProgress: number;
  distanceFromRoute: number;
  speed: number;
  estimatedArrival: Date;
  deviations: number;
  alerts: any[];
  isOnRoute: boolean;
  nextCheckpoint: {
    name: string;
    distance: number;
    eta: number;
  };
}

@Injectable()
export class GpsSimulatorService {
  private readonly logger = new Logger(GpsSimulatorService.name);
  private activeDrivers: Map<string, SimulatedDriver> = new Map();
  private simulationInterval: NodeJS.Timeout | null = null;

  constructor(
    @InjectModel(GpsEvent.name)
    private gpsEventModel: Model<GpsEventDocument>,
    @InjectModel(ScheduledRoute.name)
    private scheduledRouteModel: Model<ScheduledRouteDocument>,
    @InjectModel(Vehicle.name)
    private vehicleModel: Model<VehicleDocument>,
    @InjectModel(User.name)
    private userModel: Model<UserDocument>,
  ) {}

  /**
   * Start GPS simulation for a driver
   */
  async startDriverSimulation(
    driverId: string,
    vehicleId: string,
    scheduledRouteId: string,
  ): Promise<SimulatedDriver> {
    try {
      // Validate driver, vehicle, and route
      const [driver, vehicle, route] = await Promise.all([
        this.userModel.findById(driverId),
        this.vehicleModel.findById(vehicleId),
        this.scheduledRouteModel.findById(scheduledRouteId),
      ]);

      if (!driver || !vehicle || !route) {
        throw new Error('Driver, vehicle, or route not found');
      }

      if (!route.decodedPath || route.decodedPath.length === 0) {
        throw new Error('Route has no path data');
      }

      // Get starting position (first point in route)
      const startPosition = route.decodedPath[0];

      const simulatedDriver: SimulatedDriver = {
        driverId,
        vehicleId,
        scheduledRouteId,
        currentPosition: {
          lat: startPosition.lat,
          lng: startPosition.lng,
        },
        currentSpeed: 60, // km/h
        isActive: true,
        startTime: new Date(),
        lastUpdate: new Date(),
        progress: 0,
        deviations: 0,
        alerts: [],
      };

      this.activeDrivers.set(driverId, simulatedDriver);
      this.logger.log(`Started GPS simulation for driver ${driverId}`);

      // Start simulation if not already running
      if (!this.simulationInterval) {
        this.startSimulation();
      }

      return simulatedDriver;
    } catch (error) {
      this.logger.error(`Failed to start driver simulation: ${error.message}`);
      throw error;
    }
  }

  /**
   * Stop GPS simulation for a driver
   */
  stopDriverSimulation(driverId: string): boolean {
    const driver = this.activeDrivers.get(driverId);
    if (driver) {
      driver.isActive = false;
      this.activeDrivers.delete(driverId);
      this.logger.log(`Stopped GPS simulation for driver ${driverId}`);
      return true;
    }
    return false;
  }

  /**
   * Get current monitoring data for a driver
   */
  async getDriverMonitoringData(
    driverId: string,
  ): Promise<RouteMonitoringData | null> {
    const driver = this.activeDrivers.get(driverId);
    if (!driver || !driver.isActive) {
      return null;
    }

    const route = await this.scheduledRouteModel.findById(
      driver.scheduledRouteId,
    );
    if (!route || !route.decodedPath) {
      return null;
    }

    // Calculate route progress
    const progress = this.calculateRouteProgress(
      driver.currentPosition,
      route.decodedPath,
    );

    // Calculate distance from route
    const distanceFromRoute = this.calculateDistanceFromRoute(
      driver.currentPosition,
      route.decodedPath,
    );

    // Check if driver is on route (within 100 meters)
    const isOnRoute = distanceFromRoute <= 0.1; // 100 meters

    // Find next checkpoint
    const nextCheckpoint = this.findNextCheckpoint(
      driver.currentPosition,
      route.decodedPath,
      progress,
    );

    // Calculate estimated arrival
    const estimatedArrival = this.calculateEstimatedArrival(driver, route);

    return {
      driverId: driver.driverId,
      vehicleId: driver.vehicleId,
      scheduledRouteId: driver.scheduledRouteId,
      currentLocation: driver.currentPosition,
      routeProgress: progress,
      distanceFromRoute,
      speed: driver.currentSpeed,
      estimatedArrival,
      deviations: driver.deviations,
      alerts: driver.alerts,
      isOnRoute,
      nextCheckpoint,
    };
  }

  /**
   * Get all active drivers monitoring data
   */
  async getAllDriversMonitoringData(): Promise<RouteMonitoringData[]> {
    const monitoringData: RouteMonitoringData[] = [];

    for (const [driverId] of this.activeDrivers) {
      const data = await this.getDriverMonitoringData(driverId);
      if (data) {
        monitoringData.push(data);
      }
    }

    return monitoringData;
  }

  /**
   * Simulate driver movement along the route
   */
  private async simulateDriverMovement(driver: SimulatedDriver): Promise<void> {
    try {
      const route = await this.scheduledRouteModel.findById(
        driver.scheduledRouteId,
      );
      if (!route || !route.decodedPath) {
        return;
      }

      const now = new Date();
      const timeDiff = (now.getTime() - driver.lastUpdate.getTime()) / 1000; // seconds

      // Calculate distance traveled
      const distanceTraveled = (driver.currentSpeed * timeDiff) / 3600; // km

      // Move driver along the route
      const newPosition = this.moveAlongRoute(
        driver.currentPosition,
        route.decodedPath,
        distanceTraveled,
        driver.progress,
      );

      // Update driver position
      driver.currentPosition = newPosition;
      driver.lastUpdate = now;
      driver.progress = this.calculateRouteProgress(
        newPosition,
        route.decodedPath,
      );

      // Check for route deviation
      const distanceFromRoute = this.calculateDistanceFromRoute(
        newPosition,
        route.decodedPath,
      );
      if (distanceFromRoute > 0.1) {
        // 100 meters deviation
        driver.deviations++;
        driver.alerts.push({
          type: 'ROUTE_DEVIATION',
          severity: 'MEDIUM',
          message: `Driver deviated ${(distanceFromRoute * 1000).toFixed(0)}m from route`,
          timestamp: now,
        });

        // Create GPS event for deviation
        await this.createGpsEvent(driver, EventType.ROUTE_DEVIATION, {
          deviation: distanceFromRoute,
          severity: AlertSeverity.MEDIUM,
        });
      }

      // Create regular GPS event
      await this.createGpsEvent(driver, EventType.LOCATION);

      // Check if route is completed
      if (driver.progress >= 100) {
        driver.isActive = false;
        this.activeDrivers.delete(driver.driverId);
        this.logger.log(`Driver ${driver.driverId} completed route`);
      }
    } catch (error) {
      this.logger.error(`Error simulating driver movement: ${error.message}`);
    }
  }

  /**
   * Calculate route progress percentage
   */
  private calculateRouteProgress(
    position: { lat: number; lng: number },
    routePath: any[],
  ): number {
    let minDistance = Infinity;
    let closestIndex = 0;

    for (let i = 0; i < routePath.length; i++) {
      const distance = calculateHaversineDistance(
        { latitude: position.lat, longitude: position.lng },
        { latitude: routePath[i].lat, longitude: routePath[i].lng },
      );

      if (distance < minDistance) {
        minDistance = distance / 1000; // Convert meters to kilometers
        closestIndex = i;
      }
    }

    return (closestIndex / (routePath.length - 1)) * 100;
  }

  /**
   * Calculate distance from route
   */
  private calculateDistanceFromRoute(
    position: { lat: number; lng: number },
    routePath: any[],
  ): number {
    let minDistance = Infinity;

    for (let i = 0; i < routePath.length - 1; i++) {
      const distance = this.distanceToLineSegment(
        position.lat,
        position.lng,
        routePath[i].lat,
        routePath[i].lng,
        routePath[i + 1].lat,
        routePath[i + 1].lng,
      );

      if (distance < minDistance) {
        minDistance = distance;
      }
    }

    return minDistance;
  }

  /**
   * Calculate distance from point to line segment
   */
  private distanceToLineSegment(
    px: number,
    py: number,
    x1: number,
    y1: number,
    x2: number,
    y2: number,
  ): number {
    const A = px - x1;
    const B = py - y1;
    const C = x2 - x1;
    const D = y2 - y1;

    const dot = A * C + B * D;
    const lenSq = C * C + D * D;
    let param = -1;

    if (lenSq !== 0) {
      param = dot / lenSq;
    }

    let xx, yy;

    if (param < 0) {
      xx = x1;
      yy = y1;
    } else if (param > 1) {
      xx = x2;
      yy = y2;
    } else {
      xx = x1 + param * C;
      yy = y1 + param * D;
    }

    const dx = px - xx;
    const dy = py - yy;

    return Math.sqrt(dx * dx + dy * dy);
  }

  /**
   * Move driver along the route
   */
  private moveAlongRoute(
    currentPosition: { lat: number; lng: number },
    routePath: any[],
    distance: number,
    currentProgress: number,
  ): { lat: number; lng: number } {
    const currentIndex = Math.floor(
      (currentProgress / 100) * (routePath.length - 1),
    );
    const targetIndex = Math.min(
      currentIndex + Math.floor(distance * 100),
      routePath.length - 1,
    );

    return {
      lat: routePath[targetIndex].lat,
      lng: routePath[targetIndex].lng,
    };
  }

  /**
   * Find next checkpoint
   */
  private findNextCheckpoint(
    position: { lat: number; lng: number },
    routePath: any[],
    progress: number,
  ): { name: string; distance: number; eta: number } {
    const currentIndex = Math.floor((progress / 100) * routePath.length);
    const nextIndex = Math.min(currentIndex + 10, routePath.length - 1);

    const distance = calculateHaversineDistance(
      { latitude: position.lat, longitude: position.lng },
      {
        latitude: routePath[nextIndex].lat,
        longitude: routePath[nextIndex].lng,
      },
    );

    return {
      name: `Checkpoint ${nextIndex}`,
      distance: distance / 1000, // Convert meters to kilometers
      eta: distance / 1000 / 60, // Assuming 60 km/h average speed
    };
  }

  /**
   * Calculate estimated arrival time
   */
  private calculateEstimatedArrival(driver: SimulatedDriver, route: any): Date {
    const remainingProgress = 100 - driver.progress;
    const remainingDistance =
      (route.estimatedDistance / 1000) * (remainingProgress / 100);
    const remainingHours = remainingDistance / driver.currentSpeed;

    const eta = new Date();
    eta.setHours(eta.getHours() + remainingHours);

    return eta;
  }

  /**
   * Create GPS event
   */
  private async createGpsEvent(
    driver: SimulatedDriver,
    eventType: EventType,
    additionalData?: any,
  ): Promise<void> {
    try {
      const gpsEvent = new this.gpsEventModel({
        vehicleId: new Types.ObjectId(driver.vehicleId),
        scheduledRouteId: new Types.ObjectId(driver.scheduledRouteId),
        latitude: driver.currentPosition.lat,
        longitude: driver.currentPosition.lng,
        timestamp: new Date(),
        speed: driver.currentSpeed,
        eventType,
        eventData: {
          coordinates: {
            lat: driver.currentPosition.lat,
            lng: driver.currentPosition.lng,
          },
          speed: driver.currentSpeed,
          ...additionalData,
        },
        isProcessed: true,
        isAlert: eventType !== EventType.LOCATION,
      });

      await gpsEvent.save();
    } catch (error) {
      this.logger.error(`Error creating GPS event: ${error.message}`);
    }
  }

  /**
   * Start the simulation loop
   */
  private startSimulation(): void {
    this.simulationInterval = setInterval(async () => {
      for (const [driverId, driver] of this.activeDrivers) {
        if (driver.isActive) {
          await this.simulateDriverMovement(driver);
        }
      }
    }, 5000); // Update every 5 seconds

    this.logger.log('GPS simulation started');
  }

  /**
   * Stop the simulation
   */
  stopSimulation(): void {
    if (this.simulationInterval) {
      clearInterval(this.simulationInterval);
      this.simulationInterval = null;
      this.activeDrivers.clear();
      this.logger.log('GPS simulation stopped');
    }
  }
}
