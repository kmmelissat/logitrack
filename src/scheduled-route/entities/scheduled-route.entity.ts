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

  // Timestamps are automatically handled by mongoose with timestamps: true
  createdAt: Date;
  updatedAt: Date;
}

export const ScheduledRouteSchema =
  SchemaFactory.createForClass(ScheduledRoute);
