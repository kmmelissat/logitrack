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
  distanceFromRoute: number;
  nextCheckpoint: {
    name: string;
    distance: number;
    eta: number;
  };
  estimatedArrival: Date;
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
        distanceFromRoute: 0,
        nextCheckpoint: { name: '', distance: 0, eta: 0 },
        estimatedArrival: new Date(),
      };

      this.activeDrivers.set(driverId, simulatedDriver);
      this.logger.log(`Started GPS simulation for driver ${driverId}`);

      // Update route status to active
      try {
        await this.scheduledRouteModel.findByIdAndUpdate(scheduledRouteId, {
          status: 'en_progreso',
          actualStartTime: new Date(),
        });
        this.logger.log(`Route ${scheduledRouteId} marked as active`);
      } catch (error) {
        this.logger.error(
          `Error updating route status to active: ${error.message}`,
        );
      }

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
  async stopDriverSimulation(driverId: string): Promise<boolean> {
    const driver = this.activeDrivers.get(driverId);
    if (driver) {
      driver.isActive = false;
      this.activeDrivers.delete(driverId);
      this.logger.log(`Stopped GPS simulation for driver ${driverId}`);

      // Update route status back to planned if not completed
      try {
        const route = await this.scheduledRouteModel.findById(
          driver.scheduledRouteId,
        );
        if (route && route.status === 'en_progreso' && driver.progress < 100) {
          await this.scheduledRouteModel.findByIdAndUpdate(
            driver.scheduledRouteId,
            {
              status: 'planificada',
            },
          );
          this.logger.log(
            `Route ${driver.scheduledRouteId} marked back as planned (simulation stopped)`,
          );
        }
      } catch (error) {
        this.logger.error(
          `Error updating route status when stopping simulation: ${error.message}`,
        );
      }

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
    const nextCheckpoint = this.findNextCheckpoint(driver, route.decodedPath);

    // Calculate estimated arrival
    const estimatedArrival = this.calculateEstimatedArrival(
      driver,
      route.decodedPath,
    );

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
      this.logger.log(`Simulating movement for driver ${driver.driverId}`);

      const route = await this.scheduledRouteModel.findById(
        driver.scheduledRouteId,
      );
      if (!route || !route.decodedPath || route.decodedPath.length === 0) {
        this.logger.error(
          `Route ${driver.scheduledRouteId} not found or has no decodedPath`,
        );
        this.logger.error(`Route exists: ${!!route}`);
        this.logger.error(`Has decodedPath: ${!!route?.decodedPath}`);
        this.logger.error(
          `DecodedPath length: ${route?.decodedPath?.length || 0}`,
        );
        return;
      }

      this.logger.log(
        `Route found with ${route.decodedPath.length} path points`,
      );
      this.logger.log(`Driver progress: ${driver.progress}%`);
      this.logger.log(
        `Current position: ${driver.currentPosition.lat}, ${driver.currentPosition.lng}`,
      );

      // Calculate progress along the route
      const progress = this.calculateRouteProgress(
        driver.currentPosition,
        route.decodedPath,
      );
      driver.progress = progress;

      // Move driver along the route
      const newPosition = this.moveAlongRoute(driver, route.decodedPath);
      if (newPosition) {
        driver.currentPosition = newPosition;
        this.logger.log(
          `Driver moved to: ${newPosition.lat}, ${newPosition.lng}`,
        );
      }

      // Calculate distance from route
      const distanceFromRoute = this.calculateDistanceFromRoute(
        driver.currentPosition,
        route.decodedPath,
      );
      driver.distanceFromRoute = distanceFromRoute;

      // Check for route deviation
      if (distanceFromRoute > 0.1) {
        // 100 meters deviation threshold
        driver.deviations++;
        this.logger.warn(`Route deviation detected: ${distanceFromRoute} km`);
        await this.createGpsEvent(driver, EventType.ROUTE_DEVIATION, {
          distanceFromRoute,
          expectedPosition: this.findNearestPointOnRoute(
            driver.currentPosition,
            route.decodedPath,
          ),
        });
      }

      // Update speed (simulate realistic speed variations)
      const speedVariation = (Math.random() - 0.5) * 20; // ±10 km/h variation
      driver.currentSpeed = Math.max(30, Math.min(80, 60 + speedVariation));

      // Find next checkpoint
      const nextCheckpoint = this.findNextCheckpoint(driver, route.decodedPath);
      driver.nextCheckpoint = nextCheckpoint;

      // Calculate estimated arrival
      const estimatedArrival = this.calculateEstimatedArrival(
        driver,
        route.decodedPath,
      );
      driver.estimatedArrival = estimatedArrival;

      // Create regular location event
      await this.createGpsEvent(driver, EventType.LOCATION, {
        speed: driver.currentSpeed,
        progress: driver.progress,
        distanceFromRoute,
        nextCheckpoint,
        estimatedArrival,
      });

      // Check if route is completed
      if (driver.progress >= 100) {
        driver.isActive = false;
        this.activeDrivers.delete(driver.driverId);
        this.logger.log(`Driver ${driver.driverId} completed route`);
        // Update route status to completed
        try {
          await this.scheduledRouteModel.findByIdAndUpdate(
            driver.scheduledRouteId,
            {
              status: 'completada',
              actualEndTime: new Date(),
            },
          );
          this.logger.log(
            `Route ${driver.scheduledRouteId} marked as completed`,
          );
        } catch (error) {
          this.logger.error(`Error updating route status: ${error.message}`);
        }
      }
    } catch (error) {
      this.logger.error(`Error in simulateDriverMovement: ${error.message}`);
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
    driver: SimulatedDriver,
    routePath: any[],
  ): { lat: number; lng: number } | null {
    const currentIndex = Math.floor(
      (driver.progress / 100) * (routePath.length - 1),
    );
    const targetIndex = Math.min(
      currentIndex + 1, // Move one step at a time
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
    driver: SimulatedDriver,
    routePath: any[],
  ): { name: string; distance: number; eta: number } {
    const currentIndex = Math.floor((driver.progress / 100) * routePath.length);
    const nextIndex = Math.min(currentIndex + 1, routePath.length - 1);

    const distance = calculateHaversineDistance(
      {
        latitude: driver.currentPosition.lat,
        longitude: driver.currentPosition.lng,
      },
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
  private calculateEstimatedArrival(
    driver: SimulatedDriver,
    routePath: any[],
  ): Date {
    const remainingProgress = 100 - driver.progress;
    const remainingDistance =
      (routePath.length / 100) * (remainingProgress / 100); // Simplified distance calculation
    const remainingHours = remainingDistance / driver.currentSpeed;

    const estimatedArrival = new Date();
    estimatedArrival.setHours(estimatedArrival.getHours() + remainingHours);
    return estimatedArrival;
  }

  /**
   * Find the nearest point on the route to a given position
   */
  private findNearestPointOnRoute(
    position: { lat: number; lng: number },
    routePath: any[],
  ): { lat: number; lng: number } {
    let nearestPoint = routePath[0];
    let minDistance = Infinity;

    for (const point of routePath) {
      const distance = calculateHaversineDistance(
        { latitude: position.lat, longitude: position.lng },
        { latitude: point.lat, longitude: point.lng },
      );
      if (distance < minDistance) {
        minDistance = distance;
        nearestPoint = point;
      }
    }

    return { lat: nearestPoint.lat, lng: nearestPoint.lng };
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
      this.logger.log(
        `Creating GPS event for driver ${driver.driverId}, type: ${eventType}`,
      );

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

      this.logger.log(`GPS event object created, attempting to save...`);
      const savedEvent = await gpsEvent.save();
      this.logger.log(
        `GPS event saved successfully with ID: ${savedEvent._id}`,
      );
    } catch (error) {
      this.logger.error(`Error creating GPS event: ${error.message}`);
      this.logger.error(`Error stack: ${error.stack}`);
    }
  }

  /**
   * Start the simulation loop
   */
  private startSimulation(): void {
    this.logger.log('Starting GPS simulation loop...');
    this.simulationInterval = setInterval(async () => {
      this.logger.log(
        `Simulation tick - Active drivers: ${this.activeDrivers.size}`,
      );
      for (const [driverId, driver] of this.activeDrivers) {
        if (driver.isActive) {
          this.logger.log(`Processing driver: ${driverId}`);
          await this.simulateDriverMovement(driver);
        } else {
          this.logger.log(`Driver ${driverId} is not active, skipping`);
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
