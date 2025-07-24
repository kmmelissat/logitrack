import { Test, TestingModule } from '@nestjs/testing';
import { getModelToken } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { ScheduledRouteService } from './scheduled-route.service';
import { ScheduledRoute } from './entities/scheduled-route.entity';
import { RoutePoint } from '../route-point/entities/route-point.entity';
import { Vehicle } from '../vehicle/entities/vehicle.entity';
import { User } from '../users/entities/user.entity';
import { MapsService } from '../maps/maps.service';
import { VehicleStatus } from '../vehicle/enums/vehicle-status.enum';
import { Role } from '../auth/enums/role.enum';
import { BadRequestException, NotFoundException } from '@nestjs/common';

describe('ScheduledRouteService', () => {
  let service: ScheduledRouteService;
  let scheduledRouteModel: Model<ScheduledRoute>;
  let vehicleModel: Model<Vehicle>;
  let userModel: Model<User>;

  const mockScheduledRouteModel = {
    find: jest.fn(),
    findById: jest.fn(),
    findByIdAndUpdate: jest.fn(),
    findOne: jest.fn(),
    countDocuments: jest.fn(),
    new: jest.fn(),
    save: jest.fn(),
  };

  const mockRoutePointModel = {
    find: jest.fn(),
    sort: jest.fn(),
    exec: jest.fn(),
  };

  const mockVehicleModel = {
    findById: jest.fn(),
    find: jest.fn(),
    exec: jest.fn(),
  };

  const mockUserModel = {
    findById: jest.fn(),
    find: jest.fn(),
    exec: jest.fn(),
  };

  const mockMapsService = {
    // Add any methods that MapsService might have
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ScheduledRouteService,
        {
          provide: getModelToken(ScheduledRoute.name),
          useValue: mockScheduledRouteModel,
        },
        {
          provide: getModelToken(RoutePoint.name),
          useValue: mockRoutePointModel,
        },
        {
          provide: getModelToken(Vehicle.name),
          useValue: mockVehicleModel,
        },
        {
          provide: getModelToken(User.name),
          useValue: mockUserModel,
        },
        {
          provide: MapsService,
          useValue: mockMapsService,
        },
      ],
    }).compile();

    service = module.get<ScheduledRouteService>(ScheduledRouteService);
    scheduledRouteModel = module.get<Model<ScheduledRoute>>(
      getModelToken(ScheduledRoute.name),
    );
    vehicleModel = module.get<Model<Vehicle>>(getModelToken(Vehicle.name));
    userModel = module.get<Model<User>>(getModelToken(User.name));
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('validateVehicleDriverAssignment', () => {
    it('should throw NotFoundException when vehicle does not exist', async () => {
      const vehicleId = new Types.ObjectId();
      const driverId = new Types.ObjectId();

      mockVehicleModel.findById.mockResolvedValue(null);

      await expect(
        service['validateVehicleDriverAssignment'](vehicleId, driverId),
      ).rejects.toThrow(NotFoundException);
    });

    it('should throw BadRequestException when vehicle is not active', async () => {
      const vehicleId = new Types.ObjectId();
      const driverId = new Types.ObjectId();

      const mockVehicle = {
        _id: vehicleId,
        status: VehicleStatus.TALLER,
        assignedDriverId: driverId,
      };

      mockVehicleModel.findById.mockResolvedValue(mockVehicle);

      await expect(
        service['validateVehicleDriverAssignment'](vehicleId, driverId),
      ).rejects.toThrow(BadRequestException);
    });

    it('should throw BadRequestException when vehicle has no assigned driver', async () => {
      const vehicleId = new Types.ObjectId();
      const driverId = new Types.ObjectId();

      const mockVehicle = {
        _id: vehicleId,
        status: VehicleStatus.ACTIVO,
        assignedDriverId: null,
      };

      mockVehicleModel.findById.mockResolvedValue(mockVehicle);

      await expect(
        service['validateVehicleDriverAssignment'](vehicleId, driverId),
      ).rejects.toThrow(BadRequestException);
    });

    it('should throw BadRequestException when driver does not match vehicle assignment', async () => {
      const vehicleId = new Types.ObjectId();
      const assignedDriverId = new Types.ObjectId();
      const requestedDriverId = new Types.ObjectId();

      const mockVehicle = {
        _id: vehicleId,
        status: VehicleStatus.ACTIVO,
        assignedDriverId: assignedDriverId,
        equals: jest.fn().mockReturnValue(false),
      };

      mockVehicleModel.findById.mockResolvedValue(mockVehicle);

      await expect(
        service['validateVehicleDriverAssignment'](
          vehicleId,
          requestedDriverId,
        ),
      ).rejects.toThrow(BadRequestException);
    });

    it('should return vehicle when validation passes', async () => {
      const vehicleId = new Types.ObjectId();
      const driverId = new Types.ObjectId();

      const mockVehicle = {
        _id: vehicleId,
        status: VehicleStatus.ACTIVO,
        assignedDriverId: driverId,
        equals: jest.fn().mockReturnValue(true),
      };

      mockVehicleModel.findById.mockResolvedValue(mockVehicle);

      const result = await service['validateVehicleDriverAssignment'](
        vehicleId,
        driverId,
      );

      expect(result).toBe(mockVehicle);
    });
  });
});
