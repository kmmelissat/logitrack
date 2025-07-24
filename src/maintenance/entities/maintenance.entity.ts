import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';

export type MaintenanceDocument = Maintenance & Document;

@Schema({
  collection: 'maintenances',
  timestamps: true,
  versionKey: false, // This excludes the __v field from responses
})
export class Maintenance {
  _id: Types.ObjectId;

  @Prop({ required: true })
  type: string;

  @Prop({ required: true })
  description: string;

  @Prop({ required: true, type: Date })
  maintenanceDate: Date;

  @Prop({ required: true, type: Number })
  cost: number;

  @Prop()
  provider?: string;

  @Prop()
  mileageAtMaintenance?: number;

  @Prop({ type: Date })
  nextMaintenanceDate?: Date;

  @Prop()
  nextMaintenanceMileage?: number;

  @Prop({ default: true })
  isCompleted: boolean;

  @Prop({ type: Types.ObjectId, ref: 'Vehicle', required: true })
  vehicleId: Types.ObjectId;

  // Timestamps are automatically handled by mongoose with timestamps: true
  createdAt: Date;
  updatedAt: Date;
}

export const MaintenanceSchema = SchemaFactory.createForClass(Maintenance);
