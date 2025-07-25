import { Test, TestingModule } from '@nestjs/testing';
import { getModelToken } from '@nestjs/mongoose';
import { RoutePointService } from './route-point.service';
import { MapsService } from '../maps/maps.service';
import { BadRequestException, NotFoundException } from '@nestjs/common';
import { Model, Types } from 'mongoose';
import { PointType } from './entities/route-point.entity';

describe('RoutePointService', () => {
  let service: RoutePointService;
  let routePointModel: any;
  let scheduledRouteModel: any;
  let mapsService: any;

  beforeEach(async () => {
    routePointModel = {
      findById: jest.fn(),
      find: jest.fn(),
      insertMany: jest.fn(),
      findByIdAndUpdate: jest.fn(),
      findByIdAndDelete: jest.fn(),
      exec: jest.fn(),
      save: jest.fn(),
      populate: jest.fn(),
      sort: jest.fn().mockReturnThis(),
      limit: jest.fn().mockReturnThis(),
    };

    scheduledRouteModel = {
      findById: jest.fn(),
      findByIdAndUpdate: jest.fn(),
    };

    mapsService = {
      calculateRouteFromPoints: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        RoutePointService,
        {
          provide: getModelToken('RoutePoint'),
          useValue: routePointModel,
        },
        {
          provide: getModelToken('ScheduledRoute'),
          useValue: scheduledRouteModel,
        },
        {
          provide: MapsService,
          useValue: mapsService,
        },
      ],
    }).compile();

    service = module.get<RoutePointService>(RoutePointService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('create', () => {
    it('should throw NotFoundException if scheduled route does not exist', async () => {
      scheduledRouteModel.findById.mockResolvedValue(null);

      await expect(
        service.create({
          name: 'Point A',
          latitude: 10,
          longitude: 20,
          scheduledRouteId: new Types.ObjectId().toHexString(),
        }),
      ).rejects.toThrow(NotFoundException);
    });

    it('should throw BadRequestException for invalid latitude', async () => {
      scheduledRouteModel.findById.mockResolvedValue({ _id: 'mockRoute' });

      await expect(
        service.create({
          name: 'Invalid Lat',
          latitude: 100,
          longitude: 20,
          scheduledRouteId: new Types.ObjectId().toHexString(),
        }),
      ).rejects.toThrow(BadRequestException);
    });

    it('should throw BadRequestException for invalid longitude', async () => {
      scheduledRouteModel.findById.mockResolvedValue({ _id: 'mockRoute' });

      await expect(
        service.create({
          name: 'Invalid Lng',
          latitude: 10,
          longitude: 200,
          scheduledRouteId: new Types.ObjectId().toHexString(),
        }),
      ).rejects.toThrow(BadRequestException);
    });

    it('should create a route point successfully when data is valid', async () => {
      const mockScheduledRouteId = new Types.ObjectId().toHexString();
      const mockSavedRoutePoint = {
        _id: new Types.ObjectId(),
        name: 'Valid Point',
        latitude: 10,
        longitude: 20,
        sequenceOrder: 1,
        scheduledRouteId: mockScheduledRouteId,
      };

      scheduledRouteModel.findById.mockResolvedValue({ _id: mockScheduledRouteId });

      routePointModel.find.mockReturnValue({
        sort: () => ({ limit: () => ({ exec: () => [] }) }),
      });

      const saveMock = jest.fn().mockResolvedValue(mockSavedRoutePoint);

      function MockRoutePoint(this: any) {
        Object.assign(this, { save: saveMock });
      }

      routePointModel.findById = jest.fn().mockReturnValue({
        populate: jest.fn().mockReturnValue({
          exec: jest.fn().mockResolvedValue(mockSavedRoutePoint),
        }),
      });

      const routePointModelWithConstructor = Object.assign(MockRoutePoint, routePointModel);

      service = new RoutePointService(routePointModelWithConstructor as any, scheduledRouteModel, mapsService);

      const result = await service.create({
        name: 'Valid Point',
        latitude: 10,
        longitude: 20,
        scheduledRouteId: mockScheduledRouteId,
      });

      expect(result).toEqual(mockSavedRoutePoint);
    });
  });

  describe('createWithDistance', () => {
    it('should throw BadRequestException if route points belong to different scheduled routes', async () => {
      await expect(
        service.createWithDistance([
          {
            name: 'P1',
            latitude: 1,
            longitude: 1,
            scheduledRouteId: 'route1',
          },
          {
            name: 'P2',
            latitude: 2,
            longitude: 2,
            scheduledRouteId: 'route2',
          },
        ]),
      ).rejects.toThrow(BadRequestException);
    });
  });
});
