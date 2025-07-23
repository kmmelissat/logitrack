import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Vehicle, VehicleDocument } from './entities/vehicle.entity';
import { CreateVehicleDto } from './dto/create-vehicle.dto';
import { UpdateVehicleDto } from './dto/update-vehicle.dto';
import { DriverVehicleUpdateDto } from './dto/driver-vehicle-update.dto';
import { VehicleAssignmentDto } from './dto/vehicle-assignment.dto';
import { VehicleStatus } from './enums/vehicle-status.enum';

@Injectable()
export class VehicleService {
  constructor(
    @InjectModel(Vehicle.name)
    private vehicleModel: Model<VehicleDocument>,
  ) {}

  async create(createVehicleDto: CreateVehicleDto): Promise<Vehicle> {
    const vehicle = new this.vehicleModel(createVehicleDto);
    return vehicle.save();
  }

  async findAll(): Promise<Vehicle[]> {
    return this.vehicleModel
      .find()
      .populate('assignedDriverId', 'firstName lastName email')
      .exec();
  }

  async findOne(id: string): Promise<Vehicle> {
    const vehicle = await this.vehicleModel
      .findById(id)
      .populate('assignedDriverId', 'firstName lastName email')
      .exec();

    if (!vehicle) {
      throw new NotFoundException(`Vehicle with ID ${id} not found`);
    }

    return vehicle;
  }

  async update(
    id: string,
    updateVehicleDto: UpdateVehicleDto,
  ): Promise<Vehicle> {
    const vehicle = await this.vehicleModel
      .findByIdAndUpdate(id, updateVehicleDto, { new: true })
      .populate('assignedDriverId', 'firstName lastName email')
      .exec();
    if (!vehicle) {
      throw new NotFoundException(`Vehicle with ID ${id} not found`);
    }
    return vehicle;
  }

  async updateDriverInfo(
    id: string,
    driverUpdateDto: DriverVehicleUpdateDto,
  ): Promise<Vehicle> {
    const vehicle = await this.vehicleModel
      .findByIdAndUpdate(id, driverUpdateDto, { new: true })
      .populate('assignedDriverId', 'firstName lastName email')
      .exec();

    if (!vehicle) {
      throw new NotFoundException(`Vehicle with ID ${id} not found`);
    }

    return vehicle;
  }

  async assignVehicle(
    id: string,
    assignmentDto: VehicleAssignmentDto,
  ): Promise<Vehicle> {
    const vehicle = await this.vehicleModel.findById(id).exec();

    if (!vehicle) {
      throw new NotFoundException(`Vehicle with ID ${id} not found`);
    }

    if (vehicle.status !== VehicleStatus.ACTIVO) {
      throw new BadRequestException('Can only assign active vehicles');
    }

    const updateData = {
      assignedDriverId: assignmentDto.driverId,
      assignmentDate: assignmentDto.assignmentDate || new Date(),
      assignmentNotes: assignmentDto.notes,
    };

    const updatedVehicle = await this.vehicleModel
      .findByIdAndUpdate(id, updateData, { new: true })
      .populate('assignedDriverId', 'firstName lastName email')
      .exec();

    if (!updatedVehicle) {
      throw new NotFoundException(`Vehicle with ID ${id} not found`);
    }

    return updatedVehicle;
  }

  async unassignVehicle(id: string): Promise<Vehicle> {
    const vehicle = await this.vehicleModel.findById(id).exec();

    if (!vehicle) {
      throw new NotFoundException(`Vehicle with ID ${id} not found`);
    }

    const updateData = {
      assignedDriverId: null,
      assignmentDate: null,
      assignmentNotes: null,
    };

    const updatedVehicle = await this.vehicleModel
      .findByIdAndUpdate(id, updateData, { new: true })
      .populate('assignedDriverId', 'firstName lastName email')
      .exec();

    if (!updatedVehicle) {
      throw new NotFoundException(`Vehicle with ID ${id} not found`);
    }

    return updatedVehicle;
  }

  async retireVehicle(id: string): Promise<Vehicle> {
    const vehicle = await this.vehicleModel.findById(id).exec();

    if (!vehicle) {
      throw new NotFoundException(`Vehicle with ID ${id} not found`);
    }

    // Unassign driver if vehicle is assigned
    const updateData: any = { status: VehicleStatus.DESCONTINUADO };
    if (vehicle.assignedDriverId) {
      updateData.assignedDriverId = null;
      updateData.assignmentDate = null;
      updateData.assignmentNotes = null;
    }

    const updatedVehicle = await this.vehicleModel
      .findByIdAndUpdate(id, updateData, { new: true })
      .populate('assignedDriverId', 'firstName lastName email')
      .exec();

    if (!updatedVehicle) {
      throw new NotFoundException(`Vehicle with ID ${id} not found`);
    }

    return updatedVehicle;
  }

  async remove(id: string): Promise<void> {
    const result = await this.vehicleModel.findByIdAndDelete(id).exec();
    if (!result) {
      throw new NotFoundException(`Vehicle with ID ${id} not found`);
    }
  }

  async findByPlateNumber(plateNumber: string): Promise<Vehicle | null> {
    return this.vehicleModel
      .findOne({ plateNumber })
      .populate('assignedDriverId', 'firstName lastName email')
      .exec();
  }

  async findByStatus(status: string): Promise<Vehicle[]> {
    return this.vehicleModel
      .find({ status })
      .populate('assignedDriverId', 'firstName lastName email')
      .exec();
  }

  async findByAssignedDriver(driverId: string): Promise<Vehicle[]> {
    return this.vehicleModel
      .find({ assignedDriverId: driverId })
      .populate('assignedDriverId', 'firstName lastName email')
      .exec();
  }

  async findAvailableVehicles(): Promise<Vehicle[]> {
    return this.vehicleModel
      .find({
        status: VehicleStatus.ACTIVO,
        assignedDriverId: { $exists: false },
      })
      .populate('assignedDriverId', 'firstName lastName email')
      .exec();
  }
}
