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
    try {
      // Check if vehicle with same plate number already exists
      const existingVehicle = await this.vehicleModel
        .findOne({
          plateNumber: createVehicleDto.plateNumber,
        })
        .exec();

      if (existingVehicle) {
        throw new BadRequestException(
          `Vehicle with plate number ${createVehicleDto.plateNumber} already exists`,
        );
      }

      const vehicle = new this.vehicleModel(createVehicleDto);
      return await vehicle.save();
    } catch (error) {
      if (error instanceof BadRequestException) {
        throw error;
      }
      throw new BadRequestException(
        `Failed to create vehicle: ${error.message}`,
      );
    }
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

    // Check if vehicle is already assigned to the same driver
    if (
      vehicle.assignedDriverId &&
      vehicle.assignedDriverId.toString() === assignmentDto.driverId
    ) {
      throw new BadRequestException(
        'Vehicle is already assigned to this driver',
      );
    }

    // Check if the driver is already assigned to another vehicle
    const existingAssignment = await this.vehicleModel
      .findOne({
        assignedDriverId: assignmentDto.driverId,
        _id: { $ne: id }, // Exclude current vehicle
      })
      .exec();

    if (existingAssignment) {
      throw new BadRequestException(
        `Driver is already assigned to vehicle ${existingAssignment.plateNumber}. Please unassign first.`,
      );
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
        $or: [
          { assignedDriverId: { $exists: false } },
          { assignedDriverId: null },
        ],
      })
      .populate('assignedDriverId', 'firstName lastName email')
      .exec();
  }

  async isVehicleAvailable(id: string): Promise<boolean> {
    const vehicle = await this.vehicleModel.findById(id).exec();

    if (!vehicle) {
      return false;
    }

    return (
      vehicle.status === VehicleStatus.ACTIVO &&
      (!vehicle.assignedDriverId || vehicle.assignedDriverId === null)
    );
  }

  async isDriverAvailable(driverId: string): Promise<boolean> {
    const existingAssignment = await this.vehicleModel
      .findOne({ assignedDriverId: driverId })
      .exec();

    return !existingAssignment;
  }

  async getSummary() {
    const [total, activos, taller, descontinuados] = await Promise.all([
      this.vehicleModel.countDocuments(),
      this.vehicleModel.countDocuments({ status: 'activo' }),
      this.vehicleModel.countDocuments({ status: 'taller' }),
      this.vehicleModel.countDocuments({ status: 'descontinuado' }),
    ]);
    return { total, activos, taller, descontinuados };
  }
}
