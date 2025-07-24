import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';

export enum RouteStatus {
  PLANIFICADA = 'planificada',
  EN_PROGRESO = 'en_progreso',
  COMPLETADA = 'completada',
  CANCELADA = 'cancelada',
}

export type ScheduledRouteDocument = ScheduledRoute & Document;

@Schema({
  collection: 'scheduled_routes',
  timestamps: true,
  versionKey: false, // This excludes the __v field from responses
})
export class ScheduledRoute {
  _id: Types.ObjectId;

  @Prop({ required: true })
  name: string;

  @Prop()
  description?: string;

  @Prop({ required: true, type: Date })
  plannedStartDate: Date;

  @Prop({ required: true, type: Date })
  plannedEndDate: Date;

  @Prop({ type: Date })
  actualStartTime?: Date;

  @Prop({ type: Date })
  actualEndTime?: Date;

  @Prop({
    type: String,
    enum: RouteStatus,
    default: RouteStatus.PLANIFICADA,
  })
  status: RouteStatus;

  @Prop({ type: Number })
  estimatedDistance?: number;

  @Prop({ type: Number })
  actualDistance?: number;

  @Prop()
  origin?: string;

  @Prop()
  destination?: string;

  @Prop({ type: Number })
  estimatedCost?: number;

  @Prop()
  notes?: string;

  @Prop({ type: Types.ObjectId, ref: 'Vehicle', required: true })
  vehicleId: Types.ObjectId;

  @Prop({ type: Types.ObjectId, ref: 'User', required: true })
  driverId: Types.ObjectId;

  // Google Maps Route Data
  @Prop()
  routePolyline?: string; // Encoded polyline from Google Maps

  @Prop({ type: [Object] })
  decodedPath?: Array<{
    lat: number;
    lng: number;
  }>; // Decoded path coordinates

  @Prop({ type: [String] })
  waypoints?: string[]; // Intermediate stops

  @Prop({ type: Number })
  estimatedDuration?: number; // Duration in seconds

  @Prop({ type: String })
  estimatedDurationText?: string; // Human readable duration

  @Prop({ type: String })
  estimatedDistanceText?: string; // Human readable distance

  @Prop({ type: [Object] })
  routeSteps?: Array<{
    instruction: string;
    distance: string;
    duration: string;
    startLocation: { lat: number; lng: number };
    endLocation: { lat: number; lng: number };
  }>; // Turn-by-turn directions

  @Prop({ type: Date })
  lastRouteCalculation?: Date; // When route was last calculated

  // Timestamps are automatically handled by mongoose with timestamps: true
  createdAt: Date;
  updatedAt: Date;
}

export const ScheduledRouteSchema =
  SchemaFactory.createForClass(ScheduledRoute);
