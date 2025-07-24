import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';

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

export type GpsEventDocument = GpsEvent & Document;

@Schema({
  collection: 'gps_events',
  timestamps: true,
  versionKey: false, // This excludes the __v field from responses
})
export class GpsEvent {
  _id: Types.ObjectId;

  @Prop({
    type: String,
    enum: EventType,
    default: EventType.LOCATION,
  })
  eventType: EventType;

  @Prop({ required: true, type: Date })
  timestamp: Date;

  @Prop({ required: true, type: Number })
  latitude: number;

  @Prop({ required: true, type: Number })
  longitude: number;

  @Prop({ type: Number })
  speed?: number;

  @Prop({ type: Number })
  heading?: number;

  @Prop({ type: Number })
  altitude?: number;

  @Prop({ type: Number })
  satellites?: number;

  @Prop({ type: Number })
  accuracy?: number;

  @Prop({
    type: String,
    enum: AlertSeverity,
  })
  severity?: AlertSeverity;

  @Prop()
  message?: string;

  @Prop({
    type: Object,
    required: true,
  })
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

  @Prop({ default: false })
  isProcessed: boolean;

  @Prop({ default: false })
  isAlert: boolean;

  @Prop({ default: false })
  isAcknowledged: boolean;

  @Prop({ type: Types.ObjectId, ref: 'Vehicle', required: true })
  vehicleId: Types.ObjectId;

  @Prop({ type: Types.ObjectId, ref: 'ScheduledRoute' })
  scheduledRouteId?: Types.ObjectId;

  // Timestamps are automatically handled by mongoose with timestamps: true
  createdAt: Date;
  updatedAt: Date;
}

export const GpsEventSchema = SchemaFactory.createForClass(GpsEvent);
