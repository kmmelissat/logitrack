import {
  Entity,
  Column,
  PrimaryGeneratedColumn,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import { Vehicle } from '../../vehicle/entities/vehicle.entity';
import { ScheduledRoute } from '../../scheduled-route/entities/scheduled-route.entity';

export enum EventType {
  LOCATION = 'location',
  SPEED_ALERT = 'speed_alert',
  ROUTE_DEVIATION = 'route_deviation',
  TEMPERATURE_ALERT = 'temperature_alert',
  GEOFENCE_ENTRY = 'geofence_entry',
  GEOFENCE_EXIT = 'geofence_exit',
  EMERGENCY = 'emergency',
  FUEL_ALERT = 'fuel_alert',
  MAINTENANCE_ALERT = 'maintenance_alert',
}

export enum AlertSeverity {
  LOW = 'low',
  MEDIUM = 'medium',
  HIGH = 'high',
  CRITICAL = 'critical',
}

@Entity('gps_events')
export class GpsEvent {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({
    type: 'enum',
    enum: EventType,
    default: EventType.LOCATION,
  })
  eventType: EventType;

  @Column({ type: 'timestamp' })
  timestamp: Date;

  @Column({ type: 'decimal', precision: 10, scale: 8 })
  latitude: number;

  @Column({ type: 'decimal', precision: 11, scale: 8 })
  longitude: number;

  @Column({ type: 'decimal', precision: 5, scale: 2, nullable: true })
  speed: number;

  @Column({ type: 'decimal', precision: 5, scale: 2, nullable: true })
  heading: number;

  @Column({ type: 'decimal', precision: 6, scale: 2, nullable: true })
  altitude: number;

  @Column({ type: 'int', nullable: true })
  satellites: number;

  @Column({ type: 'decimal', precision: 8, scale: 2, nullable: true })
  accuracy: number;

  @Column({
    type: 'enum',
    enum: AlertSeverity,
    nullable: true,
  })
  severity: AlertSeverity;

  @Column({ type: 'text', nullable: true })
  message: string;

  @Column({ type: 'json' })
  eventData: {
    coordinates: {
      lat: number;
      lng: number;
    };
    speed?: number;
    alerts?: {
      type: string;
      severity: string;
      message: string;
      timestamp: Date;
    }[];
    temperature?: {
      cargo?: number;
      engine?: number;
      ambient?: number;
    };
    fuel?: {
      level: number;
      consumption: number;
    };
    engine?: {
      rpm: number;
      temperature: number;
      oilPressure: number;
    };
    route?: {
      plannedDistance: number;
      actualDistance: number;
      deviation: number;
    };
    geofence?: {
      id: string;
      name: string;
      action: 'enter' | 'exit';
    };
    driver?: {
      id: number;
      isActive: boolean;
      drivingHours: number;
    };
    cargo?: {
      weight: number;
      temperature: number;
      humidity: number;
    };
  };

  @Column({ default: false })
  isProcessed: boolean;

  @Column({ default: false })
  isAlert: boolean;

  @Column({ default: false })
  isAcknowledged: boolean;

  // Relaciones
  @ManyToOne(() => Vehicle, (vehicle) => vehicle.gpsEvents)
  @JoinColumn({ name: 'vehicleId' })
  vehicle: Vehicle;

  @Column()
  vehicleId: number;

  @ManyToOne(
    () => ScheduledRoute,
    (scheduledRoute) => scheduledRoute.gpsEvents,
    { nullable: true },
  )
  @JoinColumn({ name: 'scheduledRouteId' })
  scheduledRoute: ScheduledRoute;

  @Column({ nullable: true })
  scheduledRouteId: number;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
