import { Test, TestingModule } from '@nestjs/testing';
import { getModelToken } from '@nestjs/mongoose';
import { GpsSimulatorService } from './gps-simulator.service';
import { GpsEvent } from './entities/gps-event.entity';
import { ScheduledRoute } from '../scheduled-route/entities/scheduled-route.entity';
import { Vehicle } from '../vehicle/entities/vehicle.entity';
import { User } from '../users/entities/user.entity';

const mockModel = () => ({
  findById: jest.fn(),
  save: jest.fn(),
});

describe('GpsSimulatorService', () => {
  let service: GpsSimulatorService;
  let gpsEventModel: any;
  let scheduledRouteModel: any;
  let vehicleModel: any;
  let userModel: any;

  beforeEach(async () => {
    gpsEventModel = mockModel();
    scheduledRouteModel = mockModel();
    vehicleModel = mockModel();
    userModel = mockModel();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        GpsSimulatorService,
        { provide: getModelToken(GpsEvent.name), useValue: gpsEventModel },
        { provide: getModelToken(ScheduledRoute.name), useValue: scheduledRouteModel },
        { provide: getModelToken(Vehicle.name), useValue: vehicleModel },
        { provide: getModelToken(User.name), useValue: userModel },
      ],
    }).compile();

    service = module.get<GpsSimulatorService>(GpsSimulatorService);
  });

  afterEach(() => {
    service.stopSimulation();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('startDriverSimulation', () => {
    it('should throw if driver, vehicle, or route is not found', async () => {
      userModel.findById.mockResolvedValue(null);
      vehicleModel.findById.mockResolvedValue({});
      scheduledRouteModel.findById.mockResolvedValue({});

      await expect(
        service.startDriverSimulation('64e4c9be72e5dce0ff000001', '64e4c9be72e5dce0ff000002', '64e4c9be72e5dce0ff000003'),
      ).rejects.toThrow('Driver, vehicle, or route not found');
    });

    it('should throw if route has no decoded path', async () => {
      userModel.findById.mockResolvedValue({});
      vehicleModel.findById.mockResolvedValue({});
      scheduledRouteModel.findById.mockResolvedValue({ decodedPath: [] });

      await expect(
        service.startDriverSimulation('64e4c9be72e5dce0ff000001', '64e4c9be72e5dce0ff000002', '64e4c9be72e5dce0ff000003'),
      ).rejects.toThrow('Route has no path data');
    });

    it('should start simulation and return simulated driver', async () => {
      userModel.findById.mockResolvedValue({});
      vehicleModel.findById.mockResolvedValue({});
      scheduledRouteModel.findById.mockResolvedValue({
        decodedPath: [{ lat: 1, lng: 2 }],
      });

      const result = await service.startDriverSimulation('64e4c9be72e5dce0ff000001', '64e4c9be72e5dce0ff000002', '64e4c9be72e5dce0ff000003');

      expect(result.driverId).toBe('64e4c9be72e5dce0ff000001');
      expect(result.vehicleId).toBe('64e4c9be72e5dce0ff000002');
      expect(result.currentPosition).toEqual({ lat: 1, lng: 2 });
    });
  });

  describe('stopDriverSimulation', () => {
    it('should stop and remove active driver', async () => {
      userModel.findById.mockResolvedValue({});
      vehicleModel.findById.mockResolvedValue({});
      scheduledRouteModel.findById.mockResolvedValue({
        decodedPath: [{ lat: 1, lng: 2 }],
      });

      await service.startDriverSimulation('64e4c9be72e5dce0ff000001', '64e4c9be72e5dce0ff000002', '64e4c9be72e5dce0ff000003');
      const stopped = service.stopDriverSimulation('64e4c9be72e5dce0ff000001');
      expect(stopped).toBe(true);
    });

    it('should return false if driver not found', () => {
      const result = service.stopDriverSimulation('not-found');
      expect(result).toBe(false);
    });
  });

  describe('getDriverMonitoringData', () => {
    it('should return null if driver is not active or route is invalid', async () => {
      const result = await service.getDriverMonitoringData('unknown');
      expect(result).toBeNull();
    });
  });
});
