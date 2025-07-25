import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import * as request from 'supertest';
import { AppModule } from '../../src/app.module';
import { getModelToken } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { ScheduledRoute } from '../../src/scheduled-route/entities/scheduled-route.entity';
import { Vehicle } from '../../src/vehicle/entities/vehicle.entity';
import { User } from '../../src/users/entities/user.entity';
import { RoutePoint } from '../../src/route-point/entities/route-point.entity';
import { VehicleStatus } from '../../src/vehicle/enums/vehicle-status.enum';
import { Role } from '../../src/auth/enums/role.enum';
import { RouteStatus } from '../../src/scheduled-route/entities/scheduled-route.entity';
import { PointType } from '../../src/route-point/entities/route-point.entity';

describe('ScheduledRoute Integration Tests', () => {
  let app: INestApplication;
  let authToken: string;
  let testVehicleId: string;
  let testDriverId: string;
  let testRouteId: string;

  const mockScheduledRouteModel = {
    find: jest.fn(),
    findById: jest.fn(),
    findByIdAndUpdate: jest.fn(),
    findOne: jest.fn(),
    countDocuments: jest.fn(),
    new: jest.fn(),
    save: jest.fn(),
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

  const mockRoutePointModel = {
    find: jest.fn(),
    sort: jest.fn(),
    exec: jest.fn(),
  };

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    })
      .overrideProvider(getModelToken(ScheduledRoute.name))
      .useValue(mockScheduledRouteModel)
      .overrideProvider(getModelToken(Vehicle.name))
      .useValue(mockVehicleModel)
      .overrideProvider(getModelToken(User.name))
      .useValue(mockUserModel)
      .overrideProvider(getModelToken(RoutePoint.name))
      .useValue(mockRoutePointModel)
      .compile();

    app = moduleFixture.createNestApplication();
    await app.init();

    // Login to get auth token
    const loginResponse = await request(app.getHttpServer())
      .post('/auth/login')
      .send({
        email: 'admin@logitrack.com',
        password: 'admin123',
      });

    authToken = loginResponse.body.token;
  });

  afterAll(async () => {
    await app.close();
  });

  beforeEach(() => {
    // Reset all mocks
    jest.clearAllMocks();
  });

  describe('Authentication', () => {
    it('should login successfully', async () => {
      const response = await request(app.getHttpServer())
        .post('/auth/login')
        .send({
          email: 'admin@logitrack.com',
          password: 'admin123',
        });

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('token');
      expect(response.body).toHaveProperty('user');
    });

    it('should fail with invalid credentials', async () => {
      const response = await request(app.getHttpServer())
        .post('/auth/login')
        .send({
          email: 'admin@logitrack.com',
          password: 'wrongpassword',
        });

      expect(response.status).toBe(401);
    });
  });

  describe('Available Resources', () => {
    it('should get available vehicles with assigned drivers', async () => {
      const mockVehicles = [
        {
          _id: new Types.ObjectId(),
          plateNumber: 'ABC-123',
          brand: 'Toyota',
          model: 'Hilux',
          status: VehicleStatus.ACTIVO,
          assignedDriverId: {
            _id: new Types.ObjectId(),
            firstName: 'Juan',
            lastName: 'Pérez',
            email: 'juan@example.com',
            role: Role.CONDUCTOR,
          },
        },
      ];

      mockVehicleModel.find.mockReturnValue({
        populate: jest.fn().mockReturnValue({
          exec: jest.fn().mockResolvedValue(mockVehicles),
        }),
      });

      const response = await request(app.getHttpServer())
        .get('/scheduled-routes/available-vehicles')
        .set('Authorization', `Bearer ${authToken}`);

      expect(response.status).toBe(200);
      expect(Array.isArray(response.body)).toBe(true);
    });

    it('should get available drivers with assigned vehicles', async () => {
      const mockDrivers = [
        {
          _id: new Types.ObjectId(),
          firstName: 'Juan',
          lastName: 'Pérez',
          email: 'juan@example.com',
          role: Role.CONDUCTOR,
        },
      ];

      mockUserModel.find.mockReturnValue({
        exec: jest.fn().mockResolvedValue(mockDrivers),
      });

      const response = await request(app.getHttpServer())
        .get('/scheduled-routes/available-drivers')
        .set('Authorization', `Bearer ${authToken}`);

      expect(response.status).toBe(200);
      expect(Array.isArray(response.body)).toBe(true);
    });
  });

  describe('Scheduled Routes', () => {
    const testRouteData = {
      name: 'Test Route',
      description: 'Test route description',
      plannedStartDate: '2025-08-01T06:00:00.000Z',
      plannedEndDate: '2025-08-01T18:00:00.000Z',
      origin: 'Test Origin',
      destination: 'Test Destination',
      estimatedDistance: 100,
      estimatedCost: 500,
      notes: 'Test notes',
    };

    it('should create a new route with valid data', async () => {
      const mockVehicle = {
        _id: new Types.ObjectId(),
        status: VehicleStatus.ACTIVO,
        assignedDriverId: new Types.ObjectId(),
      };

      const mockDriver = {
        _id: new Types.ObjectId(),
        role: Role.CONDUCTOR,
      };

      const mockRoute = {
        _id: new Types.ObjectId(),
        ...testRouteData,
        status: RouteStatus.PLANIFICADA,
        vehicleId: mockVehicle._id,
        driverId: mockDriver._id,
      };

      mockVehicleModel.findById.mockResolvedValue(mockVehicle);
      mockUserModel.findById.mockResolvedValue(mockDriver);
      mockScheduledRouteModel.findOne.mockResolvedValue(null);
      mockScheduledRouteModel.new.mockReturnValue({
        save: jest.fn().mockResolvedValue(mockRoute),
      });

      const response = await request(app.getHttpServer())
        .post('/scheduled-routes')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          ...testRouteData,
          vehicleId: mockVehicle._id.toString(),
          driverId: mockDriver._id.toString(),
        });

      expect(response.status).toBe(201);
      expect(response.body).toHaveProperty('_id');
      expect(response.body.name).toBe(testRouteData.name);
    });

    it('should fail to create route with vehicle without assigned driver', async () => {
      const mockVehicle = {
        _id: new Types.ObjectId(),
        status: VehicleStatus.ACTIVO,
        assignedDriverId: null,
      };

      mockVehicleModel.findById.mockResolvedValue(mockVehicle);

      const response = await request(app.getHttpServer())
        .post('/scheduled-routes')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          ...testRouteData,
          vehicleId: mockVehicle._id.toString(),
          driverId: new Types.ObjectId().toString(),
        });

      expect(response.status).toBe(400);
      expect(response.body.message).toContain('no tiene un conductor asignado');
    });

    it('should list routes with pagination', async () => {
      const mockRoutes = [
        {
          _id: new Types.ObjectId(),
          name: 'Test Route 1',
          status: RouteStatus.PLANIFICADA,
        },
        {
          _id: new Types.ObjectId(),
          name: 'Test Route 2',
          status: RouteStatus.EN_PROGRESO,
        },
      ];

      mockScheduledRouteModel.find.mockReturnValue({
        populate: jest.fn().mockReturnValue({
          sort: jest.fn().mockReturnValue({
            skip: jest.fn().mockReturnValue({
              limit: jest.fn().mockReturnValue({
                lean: jest.fn().mockResolvedValue(mockRoutes),
              }),
            }),
          }),
        }),
      });
      mockScheduledRouteModel.countDocuments.mockResolvedValue(2);

      const response = await request(app.getHttpServer())
        .get('/scheduled-routes?page=1&limit=10')
        .set('Authorization', `Bearer ${authToken}`);

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('data');
      expect(response.body).toHaveProperty('pagination');
    });
  });

  describe('Route Points', () => {
    const testPointData = {
      name: 'Test Point',
      description: 'Test point description',
      type: PointType.PARADA,
      latitude: 13.6929,
      longitude: -89.2182,
      address: 'Test Address',
      sequenceOrder: 1,
      plannedArrivalTime: '2025-08-01T06:00:00.000Z',
      plannedDepartureTime: '2025-08-01T06:30:00.000Z',
      estimatedStayMinutes: 30,
    };

    it('should create a route point', async () => {
      const mockPoint = {
        _id: new Types.ObjectId(),
        ...testPointData,
        scheduledRouteId: new Types.ObjectId(),
      };

      mockRoutePointModel.new = jest.fn().mockReturnValue({
        save: jest.fn().mockResolvedValue(mockPoint),
      });

      const response = await request(app.getHttpServer())
        .post('/route-points')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          ...testPointData,
          scheduledRouteId: new Types.ObjectId().toString(),
        });

      expect(response.status).toBe(201);
      expect(response.body).toHaveProperty('_id');
      expect(response.body.name).toBe(testPointData.name);
    });

    it('should list route points for a specific route', async () => {
      const mockPoints = [
        {
          _id: new Types.ObjectId(),
          name: 'Origin Point',
          type: PointType.ORIGEN,
          sequenceOrder: 1,
        },
        {
          _id: new Types.ObjectId(),
          name: 'Destination Point',
          type: PointType.DESTINO,
          sequenceOrder: 2,
        },
      ];

      mockRoutePointModel.find.mockReturnValue({
        sort: jest.fn().mockReturnValue({
          exec: jest.fn().mockResolvedValue(mockPoints),
        }),
      });

      const response = await request(app.getHttpServer())
        .get(`/route-points?routeId=${new Types.ObjectId().toString()}`)
        .set('Authorization', `Bearer ${authToken}`);

      expect(response.status).toBe(200);
      expect(Array.isArray(response.body)).toBe(true);
    });
  });

  describe('Route Updates', () => {
    it('should update route status', async () => {
      const mockRoute = {
        _id: new Types.ObjectId(),
        name: 'Test Route',
        status: RouteStatus.EN_PROGRESO,
        notes: 'Updated notes',
      };

      mockScheduledRouteModel.findByIdAndUpdate.mockReturnValue({
        populate: jest.fn().mockReturnValue({
          exec: jest.fn().mockResolvedValue(mockRoute),
        }),
      });

      const response = await request(app.getHttpServer())
        .patch(`/scheduled-routes/${mockRoute._id.toString()}`)
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          status: RouteStatus.EN_PROGRESO,
          notes: 'Updated notes',
        });

      expect(response.status).toBe(200);
      expect(response.body.status).toBe(RouteStatus.EN_PROGRESO);
    });
  });
});
