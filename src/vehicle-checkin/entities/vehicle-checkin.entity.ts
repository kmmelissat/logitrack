import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';

export enum CheckinType {
  CHECK_IN = 'check_in',
  CHECK_OUT = 'check_out',
}

export type VehicleCheckinDocument = VehicleCheckin & Document;

@Schema({
  collection: 'vehicle_checkins',
  timestamps: true,
  versionKey: false, // This excludes the __v field from responses
})
export class VehicleCheckin {
  _id: Types.ObjectId;

  @Prop({
    type: String,
    enum: CheckinType,
    required: true,
  })
  type: CheckinType;

  @Prop({ required: true, type: Date })
  timestamp: Date;

  @Prop({ type: Number })
  latitude?: number;

  @Prop({ type: Number })
  longitude?: number;

  @Prop()
  location?: string;

  @Prop({ type: Number })
  mileage?: number;

  @Prop({ type: Number })
  fuelLevel?: number;

  @Prop()
  notes?: string;

  @Prop({
    type: Object,
  })
  vehicleCondition?: {
    engineOk: boolean;
    tiresOk: boolean;
    lightsOk: boolean;
    brakesOk: boolean;
    documentsOk: boolean;
    issues?: string[];
  };

  @Prop({ type: [String] })
  photos?: string[];

  @Prop({ default: true })
  isValid: boolean;

  @Prop({ type: Types.ObjectId, ref: 'Vehicle', required: true })
  vehicleId: Types.ObjectId;

  @Prop({ type: Types.ObjectId, ref: 'User', required: true })
  driverId: Types.ObjectId;

  @Prop({ type: Types.ObjectId, ref: 'ScheduledRoute' })
  scheduledRouteId?: Types.ObjectId;

  // Timestamps are automatically handled by mongoose with timestamps: true
  createdAt: Date;
  updatedAt: Date;
}

export const VehicleCheckinSchema =
  SchemaFactory.createForClass(VehicleCheckin);
