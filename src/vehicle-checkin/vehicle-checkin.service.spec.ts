import { Test, TestingModule } from '@nestjs/testing';
import { VehicleCheckinService } from './vehicle-checkin.service';
import { getModelToken } from '@nestjs/mongoose';
import { BadRequestException, NotFoundException } from '@nestjs/common';
import { CheckinType } from './entities/vehicle-checkin.entity';

describe('VehicleCheckinService', () => {
  let service: VehicleCheckinService;
  let checkinModel: any;
  let vehicleModel: any;
  let userModel: any;
  let scheduledRouteModel: any;

  beforeEach(async () => {
    checkinModel = {
      findOne: jest.fn(),
      findById: jest.fn(),
      find: jest.fn(),
      save: jest.fn(),
    };

    vehicleModel = {
      findById: jest.fn(),
    };

    userModel = {
      findById: jest.fn(),
    };

    scheduledRouteModel = {
      findById: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        VehicleCheckinService,
        {
          provide: getModelToken('VehicleCheckin'),
          useValue: checkinModel,
        },
        {
          provide: getModelToken('Vehicle'),
          useValue: vehicleModel,
        },
        {
          provide: getModelToken('User'),
          useValue: userModel,
        },
        {
          provide: getModelToken('ScheduledRoute'),
          useValue: scheduledRouteModel,
        },
      ],
    }).compile();

    service = module.get<VehicleCheckinService>(VehicleCheckinService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('checkIn', () => {
    it('should throw NotFoundException if driver not found', async () => {
      userModel.findById.mockResolvedValue(null);

      await expect(
        service.checkIn({ vehicleId: 'v1', type: CheckinType.CHECK_IN }, 'driver1'),
      ).rejects.toThrow(NotFoundException);
    });

    it('should throw BadRequestException if user is not a driver', async () => {
      userModel.findById.mockResolvedValue({ role: 'admin' });

      await expect(
        service.checkIn({ vehicleId: 'v1', type: CheckinType.CHECK_IN }, 'driver1'),
      ).rejects.toThrow(BadRequestException);
    });

    it('should throw NotFoundException if vehicle not found', async () => {
      userModel.findById.mockResolvedValue({ role: 'conductor' });
      vehicleModel.findById.mockResolvedValue(null);

      await expect(
        service.checkIn({ vehicleId: 'v1', type: CheckinType.CHECK_IN }, 'driver1'),
      ).rejects.toThrow(NotFoundException);
    });

    it('should throw BadRequestException if vehicle is inactive', async () => {
      userModel.findById.mockResolvedValue({ role: 'conductor' });
      vehicleModel.findById.mockResolvedValue({ status: 'inactivo' });

      await expect(
        service.checkIn({ vehicleId: 'v1', type: CheckinType.CHECK_IN }, 'driver1'),
      ).rejects.toThrow(BadRequestException);
    });

    it('should check in successfully when all data is valid', async () => {
      const mockCheckin = { save: jest.fn().mockResolvedValue({ _id: 'checkin123' }) };

      userModel.findById.mockResolvedValue({ _id: 'driver1', role: 'conductor' });
      vehicleModel.findById.mockResolvedValue({
        _id: 'v1',
        status: 'activo',
        assignedDriverId: 'driver1',
      });
      checkinModel.findOne.mockReturnValue({ exec: jest.fn().mockResolvedValue(null) });

      const CheckinConstructor = Object.assign(
        jest.fn().mockImplementation(() => mockCheckin),
        checkinModel
      );

      const serviceWithCtor = new VehicleCheckinService(
        CheckinConstructor as any,
        vehicleModel,
        userModel,
        scheduledRouteModel,
      );

      const result = await serviceWithCtor.checkIn(
        { vehicleId: 'v1', type: CheckinType.CHECK_IN },
        'driver1',
      );

      expect(result).toEqual({ _id: 'checkin123' });
    });
  });

  describe('checkOut', () => {
    it('should throw NotFoundException if driver not found', async () => {
      userModel.findById.mockResolvedValue(null);

      await expect(
        service.checkOut('v1', 'driver1'),
      ).rejects.toThrow(NotFoundException);
    });

    it('should throw BadRequestException if no active checkin found', async () => {
      userModel.findById.mockResolvedValue({ _id: 'driver1' });
      checkinModel.findOne.mockReturnValue({ exec: jest.fn().mockResolvedValue(null) });

      await expect(
        service.checkOut('v1', 'driver1'),
      ).rejects.toThrow(BadRequestException);
    });

    it('should throw BadRequestException if driver does not match active checkin', async () => {
      userModel.findById.mockResolvedValue({ _id: 'driver1' });
      checkinModel.findOne.mockReturnValue({
        exec: jest.fn().mockResolvedValue({
          driverId: 'otherDriver',
        }),
      });

      await expect(
        service.checkOut('v1', 'driver1'),
      ).rejects.toThrow(BadRequestException);
    });

    it('should check out successfully', async () => {
      const mockActiveCheckin = {
        driverId: 'driver1',
        scheduledRouteId: 'route1',
        isValid: true,
        save: jest.fn().mockResolvedValue(true),
      };
      const mockCheckout = { save: jest.fn().mockResolvedValue({ _id: 'checkout456' }) };

      const CheckinConstructor = Object.assign(
        jest.fn().mockImplementation(() => mockCheckout),
        checkinModel
      );

      userModel.findById.mockResolvedValue({ _id: 'driver1' });
      checkinModel.findOne.mockReturnValue({
        exec: jest.fn().mockResolvedValue(mockActiveCheckin),
      });

      const serviceWithCtor = new VehicleCheckinService(
        CheckinConstructor as any,
        vehicleModel,
        userModel,
        scheduledRouteModel,
      );

      const result = await serviceWithCtor.checkOut('v1', 'driver1', 'done');

      expect(mockActiveCheckin.isValid).toBe(false);
      expect(mockActiveCheckin.save).toHaveBeenCalled();
      expect(mockCheckout.save).toHaveBeenCalled();
      expect(result).toEqual({ _id: 'checkout456' });
    });
  });
});
