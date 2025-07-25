import { Test, TestingModule } from '@nestjs/testing';
import { getModelToken } from '@nestjs/mongoose';
import { MaintenanceService } from './maintenance.service';
import { Maintenance } from './entities/maintenance.entity';
import { Vehicle } from '../vehicle/entities/vehicle.entity';
import { NotFoundException } from '@nestjs/common';
import { Types } from 'mongoose';

describe('MaintenanceService', () => {
  let service: MaintenanceService;
  let maintenanceModel: any;
  let vehicleModel: any;

  beforeEach(async () => {
    maintenanceModel = {
      find: jest.fn(),
      findById: jest.fn(),
      findOne: jest.fn(),
      findByIdAndUpdate: jest.fn(),
      findByIdAndDelete: jest.fn(),
    };

    vehicleModel = {
      findById: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        MaintenanceService,
        {
          provide: getModelToken(Maintenance.name),
          useValue: maintenanceModel,
        },
        {
          provide: getModelToken(Vehicle.name),
          useValue: vehicleModel,
        },
      ],
    }).compile();

    service = module.get<MaintenanceService>(MaintenanceService);
  });

  describe('create', () => {
    it('should create a maintenance and return it with vehicle info', async () => {
      const dto = {
        type: 'Oil Change',
        description: 'Changed oil',
        maintenanceDate: new Date().toISOString(), // ✅ string
        cost: 100,
        vehicleId: new Types.ObjectId().toString(), // ✅ string
      };

      const savedMaintenance = { ...dto, save: jest.fn().mockResolvedValue(dto) };
      const modelConstructor = jest.fn(() => savedMaintenance);
      Object.assign(modelConstructor, maintenanceModel);

      vehicleModel.findById.mockReturnValue({
        exec: jest.fn().mockResolvedValue({ _id: new Types.ObjectId(), plateNumber: 'ABC123' }),
      });

      const module: TestingModule = await Test.createTestingModule({
        providers: [
          MaintenanceService,
          {
            provide: getModelToken(Maintenance.name),
            useValue: modelConstructor,
          },
          {
            provide: getModelToken(Vehicle.name),
            useValue: vehicleModel,
          },
        ],
      }).compile();

      const serviceWithMocks = module.get<MaintenanceService>(MaintenanceService);
      const result = await serviceWithMocks.create(dto);

      expect(result.maintenance).toEqual(dto);
      expect(result.vehicle.plateNumber).toBe('ABC123');
    });
  });

  describe('findOne', () => {
    it('should return maintenance by ID', async () => {
      const id = new Types.ObjectId();
      const mockMaintenance = { _id: id, description: 'Engine check' };

      maintenanceModel.findById.mockReturnValue({
        populate: jest.fn().mockReturnValue({
          exec: jest.fn().mockResolvedValue(mockMaintenance),
        }),
      });

      const result = await service.findOne(id.toString());
      expect(result).toEqual(mockMaintenance);
    });

    it('should throw if not found', async () => {
      maintenanceModel.findById.mockReturnValue({
        populate: jest.fn().mockReturnValue({
          exec: jest.fn().mockResolvedValue(null),
        }),
      });

      await expect(service.findOne('notfound')).rejects.toThrow(NotFoundException);
    });
  });

  describe('findByVehicle', () => {
    it('should return maintenances by vehicleId', async () => {
      const vehicleId = new Types.ObjectId().toString();
      const maintenanceList = [{ type: 'Brake Check' }];

      maintenanceModel.find.mockReturnValue({
        populate: jest.fn().mockReturnValue({
          exec: jest.fn().mockResolvedValue(maintenanceList),
        }),
      });

      vehicleModel.findById.mockReturnValue({
        exec: jest.fn().mockResolvedValue({ _id: vehicleId, plateNumber: 'XYZ123' }),
      });

      const result = await service.findByVehicle(vehicleId);

      expect(result.maintenance).toEqual(maintenanceList);
      expect(result.vehicle.plateNumber).toBe('XYZ123');
    });
  });

  describe('update', () => {
    it('should update maintenance and return it', async () => {
      const id = new Types.ObjectId();
      const updated = { _id: id, description: 'Updated desc' };

      maintenanceModel.findByIdAndUpdate.mockReturnValue({
        populate: jest.fn().mockReturnValue({
          exec: jest.fn().mockResolvedValue(updated),
        }),
      });

      const result = await service.update(id.toString(), { description: 'Updated desc' });
      expect(result).toEqual(updated);
    });

    it('should throw if maintenance not found', async () => {
      maintenanceModel.findByIdAndUpdate.mockReturnValue({
        populate: jest.fn().mockReturnValue({
          exec: jest.fn().mockResolvedValue(null),
        }),
      });

      await expect(service.update('nope', {})).rejects.toThrow(NotFoundException);
    });
  });

  describe('remove', () => {
    it('should delete maintenance', async () => {
      const id = new Types.ObjectId();

      maintenanceModel.findByIdAndDelete.mockReturnValue({
        exec: jest.fn().mockResolvedValue({ _id: id }),
      });

      await expect(service.remove(id.toString())).resolves.toBeUndefined();
    });

    it('should throw if maintenance not found', async () => {
      maintenanceModel.findByIdAndDelete.mockReturnValue({
        exec: jest.fn().mockResolvedValue(null),
      });

      await expect(service.remove('nope')).rejects.toThrow(NotFoundException);
    });
  });

  describe('findByType', () => {
    it('should return all maintenances with given type', async () => {
      const results = [{ type: 'Oil Change' }];
      maintenanceModel.find.mockReturnValue({
        populate: jest.fn().mockReturnValue({
          exec: jest.fn().mockResolvedValue(results),
        }),
      });

      const result = await service.findByType('Oil Change');
      expect(result).toEqual(results);
    });
  });

  describe('findPendingMaintenances', () => {
    it('should return all pending maintenances', async () => {
      const results = [{ type: 'Inspection', isCompleted: false }];
      maintenanceModel.find.mockReturnValue({
        populate: jest.fn().mockReturnValue({
          exec: jest.fn().mockResolvedValue(results),
        }),
      });

      const result = await service.findPendingMaintenances();
      expect(result).toEqual(results);
    });
  });
});
