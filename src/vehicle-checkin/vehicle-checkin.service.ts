import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import {
  VehicleCheckin,
  VehicleCheckinDocument,
} from './entities/vehicle-checkin.entity';
import { Vehicle, VehicleDocument } from '../vehicle/entities/vehicle.entity';
import { User, UserDocument } from '../users/entities/user.entity';
import {
  ScheduledRoute,
  ScheduledRouteDocument,
} from '../scheduled-route/entities/scheduled-route.entity';
import { CheckinType } from './entities/vehicle-checkin.entity';

export interface CreateCheckinDto {
  vehicleId: string;
  scheduledRouteId?: string;
  type: CheckinType;
  latitude?: number;
  longitude?: number;
  location?: string;
  mileage?: number;
  fuelLevel?: number;
  notes?: string;
  vehicleCondition?: {
    engineOk: boolean;
    tiresOk: boolean;
    lightsOk: boolean;
    brakesOk: boolean;
    documentsOk: boolean;
    issues?: string[];
  };
  photos?: string[];
}

@Injectable()
export class VehicleCheckinService {
  constructor(
    @InjectModel(VehicleCheckin.name)
    private checkinModel: Model<VehicleCheckinDocument>,
    @InjectModel(Vehicle.name)
    private vehicleModel: Model<VehicleDocument>,
    @InjectModel(User.name)
    private userModel: Model<UserDocument>,
    @InjectModel(ScheduledRoute.name)
    private scheduledRouteModel: Model<ScheduledRouteDocument>,
  ) {}

  async checkIn(
    createCheckinDto: CreateCheckinDto,
    driverId: string,
  ): Promise<VehicleCheckin> {
    try {
      // Validate driver exists and is a conductor
      const driver = await this.userModel.findById(driverId);
      if (!driver) {
        throw new NotFoundException('Driver not found');
      }
      if (driver.role !== 'conductor') {
        throw new BadRequestException('Only drivers can perform check-ins');
      }

      // Validate vehicle exists and is active
      const vehicle = await this.vehicleModel.findById(
        createCheckinDto.vehicleId,
      );
      if (!vehicle) {
        throw new NotFoundException('Vehicle not found');
      }
      if (vehicle.status !== 'activo') {
        throw new BadRequestException('Vehicle is not available for check-in');
      }

      // Check if driver is assigned to this vehicle
      if (vehicle.assignedDriverId?.toString() !== driverId) {
        throw new BadRequestException('Driver is not assigned to this vehicle');
      }

      // Check if there's already an active check-in for this vehicle
      const activeCheckin = await this.checkinModel
        .findOne({
          vehicleId: createCheckinDto.vehicleId,
          type: CheckinType.CHECK_IN,
          isValid: true,
        })
        .exec();

      if (activeCheckin) {
        throw new BadRequestException(
          'Vehicle is already checked in by another driver',
        );
      }

      // Validate scheduled route if provided
      if (createCheckinDto.scheduledRouteId) {
        const route = await this.scheduledRouteModel.findById(
          createCheckinDto.scheduledRouteId,
        );
        if (!route) {
          throw new NotFoundException('Scheduled route not found');
        }
        if (route.driverId.toString() !== driverId) {
          throw new BadRequestException('Driver is not assigned to this route');
        }
        if (route.vehicleId.toString() !== createCheckinDto.vehicleId) {
          throw new BadRequestException(
            'Vehicle is not assigned to this route',
          );
        }
      }

      // Create check-in record
      const checkin = new this.checkinModel({
        ...createCheckinDto,
        timestamp: new Date(),
        driverId,
      });

      return await checkin.save();
    } catch (error) {
      if (
        error instanceof NotFoundException ||
        error instanceof BadRequestException
      ) {
        throw error;
      }
      throw new BadRequestException(`Failed to check in: ${error.message}`);
    }
  }

  async checkOut(
    vehicleId: string,
    driverId: string,
    notes?: string,
  ): Promise<VehicleCheckin> {
    try {
      // Validate driver exists
      const driver = await this.userModel.findById(driverId);
      if (!driver) {
        throw new NotFoundException('Driver not found');
      }

      // Find the active check-in for this vehicle
      const activeCheckin = await this.checkinModel
        .findOne({
          vehicleId,
          type: CheckinType.CHECK_IN,
          isValid: true,
        })
        .exec();

      if (!activeCheckin) {
        throw new BadRequestException(
          'No active check-in found for this vehicle',
        );
      }

      // Verify the driver is the one who checked in
      if (activeCheckin.driverId.toString() !== driverId) {
        throw new BadRequestException(
          'Only the driver who checked in can check out',
        );
      }

      // Create check-out record
      const checkout = new this.checkinModel({
        vehicleId,
        driverId,
        type: CheckinType.CHECK_OUT,
        timestamp: new Date(),
        notes,
        scheduledRouteId: activeCheckin.scheduledRouteId,
      });

      // Invalidate the check-in record
      activeCheckin.isValid = false;
      await activeCheckin.save();

      return await checkout.save();
    } catch (error) {
      if (
        error instanceof NotFoundException ||
        error instanceof BadRequestException
      ) {
        throw error;
      }
      throw new BadRequestException(`Failed to check out: ${error.message}`);
    }
  }

  async findAll(query: any = {}): Promise<VehicleCheckin[]> {
    const filter: any = {};

    if (query.vehicleId) {
      filter.vehicleId = query.vehicleId;
    }

    if (query.driverId) {
      filter.driverId = query.driverId;
    }

    if (query.type) {
      filter.type = query.type;
    }

    if (query.isValid === 'true') {
      filter.isValid = true;
    }

    if (query.scheduledRouteId) {
      filter.scheduledRouteId = query.scheduledRouteId;
    }

    if (query.startDate && query.endDate) {
      filter.timestamp = {
        $gte: new Date(query.startDate),
        $lte: new Date(query.endDate),
      };
    }

    return this.checkinModel
      .find(filter)
      .populate('vehicleId', 'plateNumber brand model status')
      .populate('driverId', 'firstName lastName email')
      .populate('scheduledRouteId', 'name origin destination')
      .sort({ timestamp: -1 })
      .exec();
  }

  async findOne(id: string): Promise<VehicleCheckin> {
    const checkin = await this.checkinModel
      .findById(id)
      .populate('vehicleId', 'plateNumber brand model status')
      .populate('driverId', 'firstName lastName email')
      .populate('scheduledRouteId', 'name origin destination')
      .exec();

    if (!checkin) {
      throw new NotFoundException(`Check-in with ID ${id} not found`);
    }

    return checkin;
  }

  async findByVehicle(vehicleId: string): Promise<VehicleCheckin[]> {
    return this.checkinModel
      .find({ vehicleId })
      .populate('driverId', 'firstName lastName email')
      .populate('scheduledRouteId', 'name origin destination')
      .sort({ timestamp: -1 })
      .exec();
  }

  async findByDriver(driverId: string): Promise<VehicleCheckin[]> {
    return this.checkinModel
      .find({ driverId })
      .populate('vehicleId', 'plateNumber brand model status')
      .populate('scheduledRouteId', 'name origin destination')
      .sort({ timestamp: -1 })
      .exec();
  }

  async getActiveCheckin(vehicleId: string): Promise<VehicleCheckin | null> {
    return this.checkinModel
      .findOne({
        vehicleId,
        type: CheckinType.CHECK_IN,
        isValid: true,
      })
      .populate('driverId', 'firstName lastName email')
      .populate('scheduledRouteId', 'name origin destination')
      .exec();
  }

  async getVehicleStatus(vehicleId: string): Promise<any> {
    const activeCheckin = await this.getActiveCheckin(vehicleId);
    const vehicle = await this.vehicleModel.findById(vehicleId);

    if (!vehicle) {
      throw new NotFoundException('Vehicle not found');
    }

    return {
      vehicleId,
      plateNumber: vehicle.plateNumber,
      status: vehicle.status,
      isCheckedIn: !!activeCheckin,
      currentDriver: activeCheckin
        ? {
            id: activeCheckin.driverId,
            firstName: (activeCheckin.driverId as any).firstName,
            lastName: (activeCheckin.driverId as any).lastName,
            email: (activeCheckin.driverId as any).email,
          }
        : null,
      checkinTime: activeCheckin?.timestamp || null,
      assignedDriver: vehicle.assignedDriverId
        ? {
            id: vehicle.assignedDriverId,
            // Note: This would need to be populated if you want driver details
          }
        : null,
    };
  }

  async getDriverCurrentVehicle(driverId: string): Promise<any> {
          const activeCheckin = await this.checkinModel
        .findOne({
          driverId,
          type: CheckinType.CHECK_IN,
          isValid: true,
        })
      .populate('vehicleId', 'plateNumber brand model status')
      .populate('scheduledRouteId', 'name origin destination')
      .exec();

    if (!activeCheckin) {
      return { message: 'Driver is not currently checked into any vehicle' };
    }

    return {
      driverId,
      vehicle: activeCheckin.vehicleId,
      scheduledRoute: activeCheckin.scheduledRouteId,
      checkinTime: activeCheckin.timestamp,
      location: activeCheckin.location,
      mileage: activeCheckin.mileage,
      fuelLevel: activeCheckin.fuelLevel,
    };
  }

  async getCheckinHistory(
    vehicleId: string,
    days: number = 30,
  ): Promise<VehicleCheckin[]> {
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);

    return this.checkinModel
      .find({
        vehicleId,
        timestamp: { $gte: startDate },
      })
      .populate('driverId', 'firstName lastName email')
      .populate('scheduledRouteId', 'name origin destination')
      .sort({ timestamp: -1 })
      .exec();
  }
}
