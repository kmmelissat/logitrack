import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import {
  Maintenance,
  MaintenanceDocument,
} from './entities/maintenance.entity';
import { CreateMaintenanceDto } from './dto/create-maintenance.dto';
import { UpdateMaintenanceDto } from './dto/update-maintenance.dto';
import { Vehicle, VehicleDocument } from '../vehicle/entities/vehicle.entity';

@Injectable()
export class MaintenanceService {
  constructor(
    @InjectModel(Maintenance.name)
    private maintenanceModel: Model<MaintenanceDocument>,
    @InjectModel(Vehicle.name)
    private vehicleModel: Model<VehicleDocument>,
  ) {}

  async create(
    createMaintenanceDto: CreateMaintenanceDto,
  ): Promise<Maintenance> {
    const maintenance = new this.maintenanceModel(createMaintenanceDto);
    return maintenance.save();
  }

  async findAll(): Promise<Maintenance[]> {
    return this.maintenanceModel.find().populate('vehicleId').exec();
  }

  async findOne(id: string): Promise<Maintenance> {
    const maintenance = await this.maintenanceModel
      .findById(id)
      .populate('vehicleId')
      .exec();

    if (!maintenance) {
      throw new NotFoundException(`Maintenance with ID ${id} not found`);
    }

    return maintenance;
  }

  async update(
    id: string,
    updateMaintenanceDto: UpdateMaintenanceDto,
  ): Promise<Maintenance> {
    const maintenance = await this.maintenanceModel
      .findByIdAndUpdate(id, updateMaintenanceDto, { new: true })
      .populate('vehicleId')
      .exec();
    if (!maintenance) {
      throw new NotFoundException(`Maintenance with ID ${id} not found`);
    }
    return maintenance;
  }

  async remove(id: string): Promise<void> {
    const result = await this.maintenanceModel.findByIdAndDelete(id).exec();
    if (!result) {
      throw new NotFoundException(`Maintenance with ID ${id} not found`);
    }
  }

  async findByVehicle(
    vehicleId: string,
  ): Promise<{ maintenance: Maintenance[]; vehicle: any }> {
    const maintenance = await this.maintenanceModel
      .find({ vehicleId: new Types.ObjectId(vehicleId) })
      .populate('vehicleId')
      .exec();

    // Get vehicle information directly from vehicle collection
    const vehicle = await this.vehicleModel.findById(vehicleId).exec();

    return {
      maintenance,
      vehicle,
    };
  }

  async findByType(type: string): Promise<Maintenance[]> {
    return this.maintenanceModel.find({ type }).populate('vehicleId').exec();
  }

  async findPendingMaintenances(): Promise<Maintenance[]> {
    return this.maintenanceModel
      .find({ isCompleted: false })
      .populate('vehicleId')
      .exec();
  }
}
