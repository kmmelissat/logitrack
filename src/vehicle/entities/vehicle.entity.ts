import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';
import { VehicleStatus } from '../enums/vehicle-status.enum';

export type VehicleDocument = Vehicle & Document;

@Schema({
  collection: 'vehicles',
  timestamps: true,
})
export class Vehicle {
  _id: Types.ObjectId;

  @Prop({ required: true, unique: true })
  plateNumber: string;

  @Prop({ required: true })
  brand: string;

  @Prop({ required: true })
  model: string;

  @Prop({ required: true })
  year: number;

  @Prop()
  vin?: string;

  @Prop({
    type: String,
    enum: VehicleStatus,
    default: VehicleStatus.ACTIVO,
  })
  status: VehicleStatus;

  @Prop()
  mileage?: number;

  @Prop()
  fuelType?: string;

  @Prop({ type: Number })
  capacity?: number;

  // Driver update fields
  @Prop({ type: Number })
  currentMileage?: number;

  @Prop({ type: Number, min: 0, max: 100 })
  fuelLevel?: number;

  @Prop()
  driverNotes?: string;

  // Vehicle assignment fields
  @Prop({ type: Types.ObjectId, ref: 'User' })
  assignedDriverId?: Types.ObjectId;

  @Prop({ type: Date })
  assignmentDate?: Date;

  @Prop()
  assignmentNotes?: string;

  // Timestamps are automatically handled by mongoose with timestamps: true
  createdAt: Date;
  updatedAt: Date;
}

export const VehicleSchema = SchemaFactory.createForClass(Vehicle);
