import { Test, TestingModule } from '@nestjs/testing';
import { getModelToken } from '@nestjs/mongoose';
import { VehicleService } from './vehicle.service';
import { Vehicle } from './entities/vehicle.entity';
import { VehicleStatus } from './enums/vehicle-status.enum';
import { Types } from 'mongoose';
import { NotFoundException, BadRequestException } from '@nestjs/common';

describe('VehicleService', () => {
  let service: VehicleService;
  let mockVehicleModel: any;

  beforeEach(async () => {
    mockVehicleModel = {
      find: jest.fn(),
      findById: jest.fn(),
      findOne: jest.fn(),
      findByIdAndUpdate: jest.fn(),
      findByIdAndDelete: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        VehicleService,
        {
          provide: getModelToken(Vehicle.name),
          useValue: mockVehicleModel,
        },
      ],
    }).compile();

    service = module.get<VehicleService>(VehicleService);
  });

  describe('create', () => {
    it('should create a new vehicle', async () => {
      const dto = {
        plateNumber: 'ABC123',
        brand: 'Toyota',
        model: 'Corolla',
        year: 2020,
      };

      mockVehicleModel.findOne.mockReturnValue({
        exec: jest.fn().mockResolvedValue(null),
      });

      const savedVehicle = { ...dto, save: jest.fn().mockResolvedValue(dto) };
      const constructor = jest.fn(() => savedVehicle);
      Object.assign(constructor, mockVehicleModel);

      const module: TestingModule = await Test.createTestingModule({
        providers: [
          VehicleService,
          {
            provide: getModelToken(Vehicle.name),
            useValue: constructor,
          },
        ],
      }).compile();

      const serviceWithCreate = module.get<VehicleService>(VehicleService);
      const result = await serviceWithCreate.create(dto);

      expect(result).toEqual(dto);
      expect(savedVehicle.save).toHaveBeenCalled();
    });

    it('should throw if plate already exists', async () => {
      mockVehicleModel.findOne.mockReturnValue({
        exec: jest.fn().mockResolvedValue({ plateNumber: 'ABC123' }),
      });

      await expect(
        service.create({
          plateNumber: 'ABC123',
          brand: 'Toyota',
          model: 'Corolla',
          year: 2020,
        }),
      ).rejects.toThrow(BadRequestException);
    });
  });

  describe('findOne', () => {
    it('should return vehicle if found', async () => {
      const id = new Types.ObjectId();
      const vehicle = { _id: id, plateNumber: 'XYZ789' };
      mockVehicleModel.findById.mockReturnValue({
        populate: jest.fn().mockReturnValue({
          exec: jest.fn().mockResolvedValue(vehicle),
        }),
      });

      const result = await service.findOne(id.toString());
      expect(result).toEqual(vehicle);
    });

    it('should throw if vehicle not found', async () => {
      mockVehicleModel.findById.mockReturnValue({
        populate: jest.fn().mockReturnValue({
          exec: jest.fn().mockResolvedValue(null),
        }),
      });

      await expect(service.findOne('notfound')).rejects.toThrow(NotFoundException);
    });
  });

  describe('assignVehicle', () => {
    it('should assign driver if all validations pass', async () => {
      const id = new Types.ObjectId();
      const driverId = new Types.ObjectId();
      const vehicle = {
        _id: id,
        status: VehicleStatus.ACTIVO,
        assignedDriverId: null,
      };

      mockVehicleModel.findById.mockReturnValue({
        exec: jest.fn().mockResolvedValue(vehicle),
      });

      mockVehicleModel.findOne.mockReturnValue({
        exec: jest.fn().mockResolvedValue(null),
      });

      const updated = { ...vehicle, assignedDriverId: driverId };
      mockVehicleModel.findByIdAndUpdate.mockReturnValue({
        populate: jest.fn().mockReturnValue({
          exec: jest.fn().mockResolvedValue(updated),
        }),
      });

      const result = await service.assignVehicle(id.toString(), {
        driverId: driverId.toString(),
        assignmentDate: '2025-01-01T00:00:00Z',
        notes: 'Assigning driver',
      });

      expect(result.assignedDriverId).toEqual(driverId);
    });

    it('should throw if vehicle is not active', async () => {
      const id = new Types.ObjectId();
      mockVehicleModel.findById.mockReturnValue({
        exec: jest.fn().mockResolvedValue({
          _id: id,
          status: VehicleStatus.DESCONTINUADO,
        }),
      });

      await expect(
        service.assignVehicle(id.toString(), {
          driverId: new Types.ObjectId().toString(),
          assignmentDate: '2025-01-01T00:00:00Z',
          notes: '',
        }),
      ).rejects.toThrow(BadRequestException);
    });
  });

  describe('retireVehicle', () => {
    it('should mark vehicle as DESCONTINUADO', async () => {
      const id = new Types.ObjectId();
      const vehicle = {
        _id: id,
        status: VehicleStatus.ACTIVO,
        assignedDriverId: null,
      };

      mockVehicleModel.findById.mockReturnValue({
        exec: jest.fn().mockResolvedValue(vehicle),
      });

      mockVehicleModel.findByIdAndUpdate.mockReturnValue({
        populate: jest.fn().mockReturnValue({
          exec: jest.fn().mockResolvedValue({
            ...vehicle,
            status: VehicleStatus.DESCONTINUADO,
          }),
        }),
      });

      const result = await service.retireVehicle(id.toString());
      expect(result.status).toBe(VehicleStatus.DESCONTINUADO);
    });
  });

  describe('remove', () => {
    it('should delete vehicle', async () => {
      const id = new Types.ObjectId();
      mockVehicleModel.findByIdAndDelete.mockReturnValue({
        exec: jest.fn().mockResolvedValue({ _id: id }),
      });

      await expect(service.remove(id.toString())).resolves.toBeUndefined();
    });

    it('should throw if vehicle not found', async () => {
      mockVehicleModel.findByIdAndDelete.mockReturnValue({
        exec: jest.fn().mockResolvedValue(null),
      });

      await expect(service.remove('nope')).rejects.toThrow(NotFoundException);
    });
  });

  describe('isVehicleAvailable', () => {
    it('should return true if active and no driver', async () => {
      const id = new Types.ObjectId();
      mockVehicleModel.findById.mockReturnValue({
        exec: jest.fn().mockResolvedValue({
          status: VehicleStatus.ACTIVO,
          assignedDriverId: null,
        }),
      });

      const result = await service.isVehicleAvailable(id.toString());
      expect(result).toBe(true);
    });

    it('should return false if not active or has driver', async () => {
      mockVehicleModel.findById.mockReturnValue({
        exec: jest.fn().mockResolvedValue({
          status: VehicleStatus.DESCONTINUADO,
          assignedDriverId: new Types.ObjectId(),
        }),
      });

      const result = await service.isVehicleAvailable('any');
      expect(result).toBe(false);
    });

    it('should return false if vehicle not found', async () => {
      mockVehicleModel.findById.mockReturnValue({
        exec: jest.fn().mockResolvedValue(null),
      });

      const result = await service.isVehicleAvailable('unknown');
      expect(result).toBe(false);
    });
  });

  describe('isDriverAvailable', () => {
    it('should return true if driver has no vehicle', async () => {
      mockVehicleModel.findOne.mockReturnValue({
        exec: jest.fn().mockResolvedValue(null),
      });

      const result = await service.isDriverAvailable('driverId');
      expect(result).toBe(true);
    });

    it('should return false if driver already has vehicle', async () => {
      mockVehicleModel.findOne.mockReturnValue({
        exec: jest.fn().mockResolvedValue({ plateNumber: 'XYZ' }),
      });

      const result = await service.isDriverAvailable('driverId');
      expect(result).toBe(false);
    });
  });
});
