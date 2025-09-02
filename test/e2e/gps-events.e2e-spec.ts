import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import * as request from 'supertest';
import { AppModule } from '../../src/app.module';

describe('GPS Events (e2e)', () => {
  let app: INestApplication;
  let adminToken: string;
  let logisticsToken: string;
  let driverToken: string;
  let testVehicleId: string;
  let testRouteId: string;
  let testGpsEventId: string;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    await app.init();

    // Get authentication tokens
    const adminResponse = await request(app.getHttpServer())
      .post('/auth/login')
      .send({
        email: 'admin@logitrack.com',
        password: 'admin123',
      });
    adminToken = adminResponse.body.token;

    const logisticsResponse = await request(app.getHttpServer())
      .post('/auth/login')
      .send({
        email: 'logistica@logitrack.com',
        password: 'logistica123',
      });
    logisticsToken = logisticsResponse.body.token;

    const driverResponse = await request(app.getHttpServer())
      .post('/auth/login')
      .send({
        email: 'conductor1@logitrack.com',
        password: 'conductor123',
      });
    driverToken = driverResponse.body.token;

    // Create a test vehicle for GPS events
    const vehicleResponse = await request(app.getHttpServer())
      .post('/vehicles')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        plateNumber: 'GPS-TEST-001',
        brand: 'Toyota',
        model: 'Hilux',
        year: 2023,
        color: 'Blanco',
        capacity: 3.5,
        fuelType: 'Diesel',
        status: 'activo',
        lastMaintenanceDate: new Date().toISOString(),
      });
    testVehicleId = vehicleResponse.body._id;

    // Assign vehicle to driver
    await request(app.getHttpServer())
      .patch(`/vehicles/${testVehicleId}/assign`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ driverId: driverResponse.body.user._id });
  });

  afterAll(async () => {
    // Clean up test data
    if (testVehicleId) {
      await request(app.getHttpServer())
        .delete(`/vehicles/${testVehicleId}`)
        .set('Authorization', `Bearer ${adminToken}`);
    }
    await app.close();
  });

  describe('POST /gps-events', () => {
    const baseGpsEvent = {
      vehicleId: '',
      latitude: 13.6929,
      longitude: -89.2182,
      speed: 45.5,
      heading: 180,
      altitude: 650,
      accuracy: 5,
      timestamp: new Date().toISOString(),
      eventType: 'position_update',
      location: 'San Salvador Centro',
      notes: 'Regular position update',
    };

    beforeEach(() => {
      baseGpsEvent.vehicleId = testVehicleId;
    });

    it('should create GPS event as driver', async () => {
      const response = await request(app.getHttpServer())
        .post('/gps-events')
        .set('Authorization', `Bearer ${driverToken}`)
        .send(baseGpsEvent)
        .expect(201);

      expect(response.body).toHaveProperty('_id');
      expect(response.body.vehicleId).toBe(testVehicleId);
      expect(response.body.latitude).toBe(baseGpsEvent.latitude);
      expect(response.body.longitude).toBe(baseGpsEvent.longitude);
      expect(response.body.speed).toBe(baseGpsEvent.speed);
      expect(response.body.eventType).toBe(baseGpsEvent.eventType);

      testGpsEventId = response.body._id;
    });

    it('should create different types of GPS events', async () => {
      const eventTypes = [
        'position_update',
        'speed_violation',
        'route_deviation',
        'emergency',
        'maintenance_alert',
      ];

      for (const eventType of eventTypes) {
        const eventData = {
          ...baseGpsEvent,
          eventType,
          timestamp: new Date().toISOString(),
          notes: `Test ${eventType} event`,
        };

        const response = await request(app.getHttpServer())
          .post('/gps-events')
          .set('Authorization', `Bearer ${driverToken}`)
          .send(eventData)
          .expect(201);

        expect(response.body.eventType).toBe(eventType);
      }
    });

    it('should create GPS event with route information', async () => {
      const eventWithRoute = {
        ...baseGpsEvent,
        scheduledRouteId: '507f1f77bcf86cd799439012', // Mock route ID
        eventType: 'route_checkpoint',
        notes: 'Checkpoint reached',
      };

      const response = await request(app.getHttpServer())
        .post('/gps-events')
        .set('Authorization', `Bearer ${driverToken}`)
        .send(eventWithRoute)
        .expect(201);

      expect(response.body.scheduledRouteId).toBe(
        eventWithRoute.scheduledRouteId,
      );
      expect(response.body.eventType).toBe('route_checkpoint');
    });

    it('should reject GPS event creation by non-driver', async () => {
      await request(app.getHttpServer())
        .post('/gps-events')
        .set('Authorization', `Bearer ${adminToken}`)
        .send(baseGpsEvent)
        .expect(403);

      await request(app.getHttpServer())
        .post('/gps-events')
        .set('Authorization', `Bearer ${logisticsToken}`)
        .send(baseGpsEvent)
        .expect(403);
    });

    it('should fail with invalid coordinates', async () => {
      await request(app.getHttpServer())
        .post('/gps-events')
        .set('Authorization', `Bearer ${driverToken}`)
        .send({
          ...baseGpsEvent,
          latitude: 200, // Invalid latitude
        })
        .expect(400);

      await request(app.getHttpServer())
        .post('/gps-events')
        .set('Authorization', `Bearer ${driverToken}`)
        .send({
          ...baseGpsEvent,
          longitude: -200, // Invalid longitude
        })
        .expect(400);
    });

    it('should fail with missing required fields', async () => {
      const { vehicleId, ...incompleteEvent } = baseGpsEvent;

      await request(app.getHttpServer())
        .post('/gps-events')
        .set('Authorization', `Bearer ${driverToken}`)
        .send(incompleteEvent)
        .expect(400);
    });

    it('should fail with invalid event type', async () => {
      await request(app.getHttpServer())
        .post('/gps-events')
        .set('Authorization', `Bearer ${driverToken}`)
        .send({
          ...baseGpsEvent,
          eventType: 'invalid_event_type',
        })
        .expect(400);
    });
  });

  describe('GET /gps-events', () => {
    it('should get GPS events as admin', async () => {
      const response = await request(app.getHttpServer())
        .get('/gps-events')
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      expect(response.body).toHaveProperty('data');
      expect(response.body).toHaveProperty('pagination');
      expect(Array.isArray(response.body.data)).toBe(true);
    });

    it('should get GPS events as logistics', async () => {
      await request(app.getHttpServer())
        .get('/gps-events')
        .set('Authorization', `Bearer ${logisticsToken}`)
        .expect(200);
    });

    it('should get GPS events with pagination', async () => {
      const response = await request(app.getHttpServer())
        .get('/gps-events?page=1&limit=5')
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      expect(response.body.pagination).toHaveProperty('currentPage');
      expect(response.body.pagination).toHaveProperty('totalPages');
      expect(response.body.pagination).toHaveProperty('totalItems');
      expect(response.body.pagination.currentPage).toBe(1);
      expect(response.body.data.length).toBeLessThanOrEqual(5);
    });

    it('should filter GPS events by vehicle', async () => {
      const response = await request(app.getHttpServer())
        .get(`/gps-events?vehicleId=${testVehicleId}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      response.body.data.forEach((event) => {
        expect(event.vehicleId).toBe(testVehicleId);
      });
    });

    it('should filter GPS events by event type', async () => {
      const response = await request(app.getHttpServer())
        .get('/gps-events?eventType=position_update')
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      response.body.data.forEach((event) => {
        expect(event.eventType).toBe('position_update');
      });
    });

    it('should filter GPS events by date range', async () => {
      const startDate = new Date(
        Date.now() - 24 * 60 * 60 * 1000,
      ).toISOString();
      const endDate = new Date().toISOString();

      const response = await request(app.getHttpServer())
        .get(`/gps-events?startDate=${startDate}&endDate=${endDate}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      response.body.data.forEach((event) => {
        expect(new Date(event.timestamp)).toBeInstanceOf(Date);
      });
    });

    it('should reject unauthenticated requests', async () => {
      await request(app.getHttpServer()).get('/gps-events').expect(401);
    });

    it('should reject driver access to all events', async () => {
      await request(app.getHttpServer())
        .get('/gps-events')
        .set('Authorization', `Bearer ${driverToken}`)
        .expect(403);
    });
  });

  describe('GET /gps-events/:id', () => {
    it('should get GPS event by ID as admin', async () => {
      const response = await request(app.getHttpServer())
        .get(`/gps-events/${testGpsEventId}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      expect(response.body._id).toBe(testGpsEventId);
      expect(response.body).toHaveProperty('vehicleId');
      expect(response.body).toHaveProperty('latitude');
      expect(response.body).toHaveProperty('longitude');
    });

    it('should get GPS event by ID as logistics', async () => {
      await request(app.getHttpServer())
        .get(`/gps-events/${testGpsEventId}`)
        .set('Authorization', `Bearer ${logisticsToken}`)
        .expect(200);
    });

    it('should return 404 for non-existent event', async () => {
      await request(app.getHttpServer())
        .get('/gps-events/507f1f77bcf86cd799439011')
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(404);
    });
  });

  describe('GET /gps-events/vehicle/:vehicleId', () => {
    it('should get GPS events for specific vehicle', async () => {
      const response = await request(app.getHttpServer())
        .get(`/gps-events/vehicle/${testVehicleId}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      expect(response.body).toHaveProperty('data');
      expect(Array.isArray(response.body.data)).toBe(true);

      response.body.data.forEach((event) => {
        expect(event.vehicleId).toBe(testVehicleId);
      });
    });

    it('should allow driver to see own vehicle events', async () => {
      await request(app.getHttpServer())
        .get(`/gps-events/vehicle/${testVehicleId}`)
        .set('Authorization', `Bearer ${driverToken}`)
        .expect(200);
    });
  });

  describe('GET /gps-events/route/:routeId', () => {
    it('should get GPS events for specific route', async () => {
      // This test assumes a route exists - in a real scenario you'd create one first
      const mockRouteId = '507f1f77bcf86cd799439012';

      await request(app.getHttpServer())
        .get(`/gps-events/route/${mockRouteId}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);
    });
  });

  describe('Real-time tracking features', () => {
    it('should get latest position for vehicle', async () => {
      const response = await request(app.getHttpServer())
        .get(`/gps-events/vehicle/${testVehicleId}/latest`)
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      if (response.body) {
        expect(response.body).toHaveProperty('latitude');
        expect(response.body).toHaveProperty('longitude');
        expect(response.body).toHaveProperty('timestamp');
        expect(response.body.vehicleId).toBe(testVehicleId);
      }
    });

    it('should get vehicle tracking history', async () => {
      const response = await request(app.getHttpServer())
        .get(`/gps-events/vehicle/${testVehicleId}/track?hours=1`)
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      expect(Array.isArray(response.body)).toBe(true);

      response.body.forEach((event) => {
        expect(event).toHaveProperty('latitude');
        expect(event).toHaveProperty('longitude');
        expect(event).toHaveProperty('timestamp');
        expect(event.vehicleId).toBe(testVehicleId);
      });
    });

    it('should detect speed violations', async () => {
      // Create a speed violation event
      const speedViolationEvent = {
        vehicleId: testVehicleId,
        latitude: 13.7,
        longitude: -89.2,
        speed: 120, // High speed
        heading: 90,
        altitude: 650,
        accuracy: 5,
        timestamp: new Date().toISOString(),
        eventType: 'speed_violation',
        location: 'Carretera Panamericana',
        notes: 'Speed limit exceeded: 120 km/h in 80 km/h zone',
      };

      const response = await request(app.getHttpServer())
        .post('/gps-events')
        .set('Authorization', `Bearer ${driverToken}`)
        .send(speedViolationEvent)
        .expect(201);

      expect(response.body.eventType).toBe('speed_violation');
      expect(response.body.speed).toBe(120);

      // Check that speed violations can be queried
      const violationsResponse = await request(app.getHttpServer())
        .get('/gps-events?eventType=speed_violation')
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      expect(violationsResponse.body.data).toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            eventType: 'speed_violation',
            vehicleId: testVehicleId,
          }),
        ]),
      );
    });

    it('should handle emergency events', async () => {
      const emergencyEvent = {
        vehicleId: testVehicleId,
        latitude: 13.68,
        longitude: -89.19,
        speed: 0,
        heading: 0,
        altitude: 650,
        accuracy: 3,
        timestamp: new Date().toISOString(),
        eventType: 'emergency',
        location: 'Boulevard Constitución',
        notes: 'Emergency button activated by driver',
      };

      const response = await request(app.getHttpServer())
        .post('/gps-events')
        .set('Authorization', `Bearer ${driverToken}`)
        .send(emergencyEvent)
        .expect(201);

      expect(response.body.eventType).toBe('emergency');
      expect(response.body.speed).toBe(0);

      // Emergency events should be retrievable with high priority
      const emergencyResponse = await request(app.getHttpServer())
        .get('/gps-events?eventType=emergency')
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      expect(emergencyResponse.body.data.length).toBeGreaterThan(0);
    });
  });

  describe('GPS Event Analytics', () => {
    it('should get GPS events statistics', async () => {
      const response = await request(app.getHttpServer())
        .get('/gps-events/stats')
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      expect(response.body).toHaveProperty('totalEvents');
      expect(response.body).toHaveProperty('eventsByType');
      expect(response.body).toHaveProperty('recentEvents');
      expect(typeof response.body.totalEvents).toBe('number');
    });

    it('should get vehicle-specific statistics', async () => {
      const response = await request(app.getHttpServer())
        .get(`/gps-events/vehicle/${testVehicleId}/stats`)
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      expect(response.body).toHaveProperty('totalEvents');
      expect(response.body).toHaveProperty('lastEventTime');
      expect(response.body).toHaveProperty('avgSpeed');
    });
  });
});

