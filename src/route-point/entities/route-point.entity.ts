import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';

export enum PointType {
  ORIGEN = 'origen',
  DESTINO = 'destino',
  PARADA = 'parada',
  CHECKPOINT = 'checkpoint',
}

export type RoutePointDocument = RoutePoint & Document;

@Schema({
  collection: 'route_points',
  timestamps: true,
  versionKey: false, // This excludes the __v field from responses
})
export class RoutePoint {
  _id: Types.ObjectId;

  @Prop({ required: true })
  name: string;

  @Prop()
  description?: string;

  @Prop({
    type: String,
    enum: PointType,
    default: PointType.PARADA,
  })
  type: PointType;

  @Prop({ required: true, type: Number })
  latitude: number;

  @Prop({ required: true, type: Number })
  longitude: number;

  @Prop()
  address?: string;

  @Prop({ type: Number, default: 0 })
  sequenceOrder: number;

  @Prop({ type: Date })
  plannedArrivalTime?: Date;

  @Prop({ type: Date })
  actualArrivalTime?: Date;

  @Prop({ type: Date })
  plannedDepartureTime?: Date;

  @Prop({ type: Date })
  actualDepartureTime?: Date;

  @Prop({ type: Number })
  estimatedStayMinutes?: number;

  @Prop({ type: Number })
  radiusMeters?: number;

  @Prop({ default: false })
  isCompleted: boolean;

  @Prop()
  notes?: string;

  @Prop({ type: Types.ObjectId, ref: 'ScheduledRoute', required: true })
  scheduledRouteId: Types.ObjectId;

  // Timestamps are automatically handled by mongoose with timestamps: true
  createdAt: Date;
  updatedAt: Date;
}

export const RoutePointSchema = SchemaFactory.createForClass(RoutePoint);
