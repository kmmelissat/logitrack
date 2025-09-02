import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import * as request from 'supertest';
import { AppModule } from '../../src/app.module';

describe('Vehicle Check-ins (e2e)', () => {
  let app: INestApplication;
  let adminToken: string;
  let logisticsToken: string;
  let driver1Token: string;
  let driver2Token: string;
  let driver1Id: string;
  let driver2Id: string;
  let testVehicleId: string;
  let testRouteId: string;
  let testCheckinId: string;

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

    const driver1Response = await request(app.getHttpServer())
      .post('/auth/login')
      .send({
        email: 'conductor1@logitrack.com',
        password: 'conductor123',
      });
    driver1Token = driver1Response.body.token;
    driver1Id = driver1Response.body.user._id;

    const driver2Response = await request(app.getHttpServer())
      .post('/auth/login')
      .send({
        email: 'conductor2@logitrack.com',
        password: 'conductor123',
      });
    driver2Token = driver2Response.body.token;
    driver2Id = driver2Response.body.user._id;

    // Create test vehicle
    const vehicleResponse = await request(app.getHttpServer())
      .post('/vehicles')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        plateNumber: 'CHECKIN-TEST-001',
        brand: 'Nissan',
        model: 'Frontier',
        year: 2023,
        color: 'Negro',
        capacity: 2.8,
        fuelType: 'Diesel',
        status: 'activo',
        lastMaintenanceDate: new Date().toISOString(),
      });
    testVehicleId = vehicleResponse.body._id;

    // Assign vehicle to driver1
    await request(app.getHttpServer())
      .patch(`/vehicles/${testVehicleId}/assign`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ driverId: driver1Id });

    // Create test route
    const routeResponse = await request(app.getHttpServer())
      .post('/scheduled-routes')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        name: 'Check-in Test Route',
        description: 'Route for testing vehicle check-ins',
        plannedStartDate: new Date(
          Date.now() + 2 * 60 * 60 * 1000,
        ).toISOString(), // 2 hours from now
        plannedEndDate: new Date(
          Date.now() + 10 * 60 * 60 * 1000,
        ).toISOString(), // 10 hours from now
        origin: 'Terminal Check-in Test',
        destination: 'Destination Check-in Test',
        estimatedDistance: 75,
        estimatedCost: 200,
        vehicleId: testVehicleId,
        driverId: driver1Id,
        notes: 'Test route for check-in functionality',
      });
    testRouteId = routeResponse.body._id;
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

  describe('POST /vehicle-checkins/checkin', () => {
    const baseCheckinData = {
      type: 'check_in',
      latitude: 13.6929,
      longitude: -89.2182,
      location: 'Terminal San Salvador',
      mileage: 45000,
      fuelLevel: 85,
      vehicleCondition: {
        engineOk: true,
        tiresOk: true,
        lightsOk: true,
        brakesOk: true,
        documentsOk: true,
      },
      notes: 'Vehicle check-in for route start',
    };

    it('should allow driver to check in to assigned vehicle', async () => {
      const checkinData = {
        ...baseCheckinData,
        vehicleId: testVehicleId,
        scheduledRouteId: testRouteId,
      };

      const response = await request(app.getHttpServer())
        .post('/vehicle-checkins/checkin')
        .set('Authorization', `Bearer ${driver1Token}`)
        .send(checkinData)
        .expect(201);

      expect(response.body).toHaveProperty('_id');
      expect(response.body.vehicleId).toBe(testVehicleId);
      expect(response.body.driverId).toBe(driver1Id);
      expect(response.body.type).toBe('check_in');
      expect(response.body.isValid).toBe(true);
      expect(response.body.latitude).toBe(baseCheckinData.latitude);
      expect(response.body.longitude).toBe(baseCheckinData.longitude);
      expect(response.body.mileage).toBe(baseCheckinData.mileage);
      expect(response.body.fuelLevel).toBe(baseCheckinData.fuelLevel);

      testCheckinId = response.body._id;
    });

    it('should check in without route assignment', async () => {
      // First check out from previous check-in
      await request(app.getHttpServer())
        .post(`/vehicle-checkins/checkout/${testVehicleId}`)
        .set('Authorization', `Bearer ${driver1Token}`)
        .send({ notes: 'Testing checkout' });

      const checkinData = {
        ...baseCheckinData,
        vehicleId: testVehicleId,
        // No scheduledRouteId
        notes: 'General vehicle check-in without specific route',
      };

      const response = await request(app.getHttpServer())
        .post('/vehicle-checkins/checkin')
        .set('Authorization', `Bearer ${driver1Token}`)
        .send(checkinData)
        .expect(201);

      expect(response.body.scheduledRouteId).toBeUndefined();
    });

    it('should validate vehicle condition during check-in', async () => {
      // First check out
      await request(app.getHttpServer())
        .post(`/vehicle-checkins/checkout/${testVehicleId}`)
        .set('Authorization', `Bearer ${driver1Token}`)
        .send({ notes: 'Checkout for condition test' });

      const checkinWithIssues = {
        ...baseCheckinData,
        vehicleId: testVehicleId,
        vehicleCondition: {
          engineOk: false,
          tiresOk: true,
          lightsOk: false,
          brakesOk: true,
          documentsOk: true,
        },
        notes: 'Vehicle has engine and lights issues',
      };

      const response = await request(app.getHttpServer())
        .post('/vehicle-checkins/checkin')
        .set('Authorization', `Bearer ${driver1Token}`)
        .send(checkinWithIssues)
        .expect(201);

      expect(response.body.vehicleCondition.engineOk).toBe(false);
      expect(response.body.vehicleCondition.lightsOk).toBe(false);
    });

    it('should reject check-in by non-assigned driver', async () => {
      const checkinData = {
        ...baseCheckinData,
        vehicleId: testVehicleId,
      };

      await request(app.getHttpServer())
        .post('/vehicle-checkins/checkin')
        .set('Authorization', `Bearer ${driver2Token}`)
        .send(checkinData)
        .expect(400);
    });

    it('should reject check-in by non-driver roles', async () => {
      const checkinData = {
        ...baseCheckinData,
        vehicleId: testVehicleId,
      };

      await request(app.getHttpServer())
        .post('/vehicle-checkins/checkin')
        .set('Authorization', `Bearer ${adminToken}`)
        .send(checkinData)
        .expect(403);

      await request(app.getHttpServer())
        .post('/vehicle-checkins/checkin')
        .set('Authorization', `Bearer ${logisticsToken}`)
        .send(checkinData)
        .expect(403);
    });

    it('should fail with invalid coordinates', async () => {
      const invalidCheckinData = {
        ...baseCheckinData,
        vehicleId: testVehicleId,
        latitude: 200, // Invalid latitude
      };

      await request(app.getHttpServer())
        .post('/vehicle-checkins/checkin')
        .set('Authorization', `Bearer ${driver1Token}`)
        .send(invalidCheckinData)
        .expect(400);
    });

    it('should fail with missing required fields', async () => {
      const incompleteData = {
        type: 'check_in',
        vehicleId: testVehicleId,
        // Missing latitude, longitude, mileage, fuelLevel
      };

      await request(app.getHttpServer())
        .post('/vehicle-checkins/checkin')
        .set('Authorization', `Bearer ${driver1Token}`)
        .send(incompleteData)
        .expect(400);
    });

    it('should prevent double check-in to same vehicle', async () => {
      const checkinData = {
        ...baseCheckinData,
        vehicleId: testVehicleId,
        notes: 'Attempting double check-in',
      };

      await request(app.getHttpServer())
        .post('/vehicle-checkins/checkin')
        .set('Authorization', `Bearer ${driver1Token}`)
        .send(checkinData)
        .expect(400);
    });
  });

  describe('POST /vehicle-checkins/checkout/:vehicleId', () => {
    it('should allow driver to check out from vehicle', async () => {
      const checkoutData = {
        notes: 'Route completed successfully, returning to base',
      };

      const response = await request(app.getHttpServer())
        .post(`/vehicle-checkins/checkout/${testVehicleId}`)
        .set('Authorization', `Bearer ${driver1Token}`)
        .send(checkoutData)
        .expect(201);

      expect(response.body).toHaveProperty('_id');
      expect(response.body.vehicleId).toBe(testVehicleId);
      expect(response.body.driverId).toBe(driver1Id);
      expect(response.body.type).toBe('check_out');
      expect(response.body.notes).toBe(checkoutData.notes);
    });

    it('should check out without notes', async () => {
      // First check in again
      await request(app.getHttpServer())
        .post('/vehicle-checkins/checkin')
        .set('Authorization', `Bearer ${driver1Token}`)
        .send({
          ...baseCheckinData,
          vehicleId: testVehicleId,
        });

      const response = await request(app.getHttpServer())
        .post(`/vehicle-checkins/checkout/${testVehicleId}`)
        .set('Authorization', `Bearer ${driver1Token}`)
        .send({})
        .expect(201);

      expect(response.body.type).toBe('check_out');
    });

    it('should reject checkout by different driver', async () => {
      // First check in with driver1
      await request(app.getHttpServer())
        .post('/vehicle-checkins/checkin')
        .set('Authorization', `Bearer ${driver1Token}`)
        .send({
          ...baseCheckinData,
          vehicleId: testVehicleId,
        });

      // Try to checkout with driver2
      await request(app.getHttpServer())
        .post(`/vehicle-checkins/checkout/${testVehicleId}`)
        .set('Authorization', `Bearer ${driver2Token}`)
        .send({ notes: 'Unauthorized checkout attempt' })
        .expect(400);
    });

    it('should reject checkout by non-driver roles', async () => {
      await request(app.getHttpServer())
        .post(`/vehicle-checkins/checkout/${testVehicleId}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ notes: 'Admin checkout attempt' })
        .expect(403);

      await request(app.getHttpServer())
        .post(`/vehicle-checkins/checkout/${testVehicleId}`)
        .set('Authorization', `Bearer ${logisticsToken}`)
        .send({ notes: 'Logistics checkout attempt' })
        .expect(403);
    });

    it('should fail checkout when not checked in', async () => {
      // First ensure we're checked out
      await request(app.getHttpServer())
        .post(`/vehicle-checkins/checkout/${testVehicleId}`)
        .set('Authorization', `Bearer ${driver1Token}`)
        .send({});

      // Try to checkout again
      await request(app.getHttpServer())
        .post(`/vehicle-checkins/checkout/${testVehicleId}`)
        .set('Authorization', `Bearer ${driver1Token}`)
        .send({ notes: 'Double checkout attempt' })
        .expect(400);
    });

    it('should fail with non-existent vehicle', async () => {
      await request(app.getHttpServer())
        .post('/vehicle-checkins/checkout/507f1f77bcf86cd799439011')
        .set('Authorization', `Bearer ${driver1Token}`)
        .send({ notes: 'Non-existent vehicle' })
        .expect(404);
    });
  });

  describe('GET /vehicle-checkins', () => {
    beforeAll(async () => {
      // Create some test check-ins for querying
      await request(app.getHttpServer())
        .post('/vehicle-checkins/checkin')
        .set('Authorization', `Bearer ${driver1Token}`)
        .send({
          ...baseCheckinData,
          vehicleId: testVehicleId,
        });

      await request(app.getHttpServer())
        .post(`/vehicle-checkins/checkout/${testVehicleId}`)
        .set('Authorization', `Bearer ${driver1Token}`)
        .send({ notes: 'Test checkout for queries' });
    });

    it('should get all check-in records as admin', async () => {
      const response = await request(app.getHttpServer())
        .get('/vehicle-checkins')
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      expect(Array.isArray(response.body)).toBe(true);
      expect(response.body.length).toBeGreaterThan(0);

      // Check structure of check-in records
      response.body.forEach((checkin) => {
        expect(checkin).toHaveProperty('_id');
        expect(checkin).toHaveProperty('vehicleId');
        expect(checkin).toHaveProperty('driverId');
        expect(checkin).toHaveProperty('type');
        expect(checkin).toHaveProperty('timestamp');
        expect(['check_in', 'check_out']).toContain(checkin.type);
      });
    });

    it('should get check-ins as logistics', async () => {
      await request(app.getHttpServer())
        .get('/vehicle-checkins')
        .set('Authorization', `Bearer ${logisticsToken}`)
        .expect(200);
    });

    it('should filter check-ins by vehicle', async () => {
      const response = await request(app.getHttpServer())
        .get(`/vehicle-checkins?vehicleId=${testVehicleId}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      response.body.forEach((checkin) => {
        expect(checkin.vehicleId).toBe(testVehicleId);
      });
    });

    it('should filter check-ins by driver', async () => {
      const response = await request(app.getHttpServer())
        .get(`/vehicle-checkins?driverId=${driver1Id}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      response.body.forEach((checkin) => {
        expect(checkin.driverId).toBe(driver1Id);
      });
    });

    it('should filter check-ins by type', async () => {
      const checkinResponse = await request(app.getHttpServer())
        .get('/vehicle-checkins?type=check_in')
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      checkinResponse.body.forEach((checkin) => {
        expect(checkin.type).toBe('check_in');
      });

      const checkoutResponse = await request(app.getHttpServer())
        .get('/vehicle-checkins?type=check_out')
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      checkoutResponse.body.forEach((checkout) => {
        expect(checkout.type).toBe('check_out');
      });
    });

    it('should filter check-ins by valid status', async () => {
      const response = await request(app.getHttpServer())
        .get('/vehicle-checkins?isValid=true')
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      response.body.forEach((checkin) => {
        expect(checkin.isValid).toBe(true);
      });
    });

    it('should filter check-ins by date range', async () => {
      const startDate = new Date(
        Date.now() - 24 * 60 * 60 * 1000,
      ).toISOString();
      const endDate = new Date().toISOString();

      const response = await request(app.getHttpServer())
        .get(`/vehicle-checkins?startDate=${startDate}&endDate=${endDate}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      response.body.forEach((checkin) => {
        const checkinDate = new Date(checkin.timestamp);
        expect(checkinDate >= new Date(startDate)).toBe(true);
        expect(checkinDate <= new Date(endDate)).toBe(true);
      });
    });

    it('should reject unauthorized access', async () => {
      await request(app.getHttpServer()).get('/vehicle-checkins').expect(401);
    });
  });

  describe('GET /vehicle-checkins/vehicle/:vehicleId', () => {
    it('should get check-in history for specific vehicle', async () => {
      const response = await request(app.getHttpServer())
        .get(`/vehicle-checkins/vehicle/${testVehicleId}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      expect(Array.isArray(response.body)).toBe(true);

      response.body.forEach((checkin) => {
        expect(checkin.vehicleId).toBe(testVehicleId);
      });
    });

    it('should allow driver to see assigned vehicle check-ins', async () => {
      await request(app.getHttpServer())
        .get(`/vehicle-checkins/vehicle/${testVehicleId}`)
        .set('Authorization', `Bearer ${driver1Token}`)
        .expect(200);
    });

    it('should return 404 for non-existent vehicle', async () => {
      await request(app.getHttpServer())
        .get('/vehicle-checkins/vehicle/507f1f77bcf86cd799439011')
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(404);
    });
  });

  describe('GET /vehicle-checkins/driver/:driverId', () => {
    it('should get check-in history for specific driver', async () => {
      const response = await request(app.getHttpServer())
        .get(`/vehicle-checkins/driver/${driver1Id}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      expect(Array.isArray(response.body)).toBe(true);

      response.body.forEach((checkin) => {
        expect(checkin.driverId).toBe(driver1Id);
      });
    });

    it('should allow driver to see own check-in history', async () => {
      await request(app.getHttpServer())
        .get(`/vehicle-checkins/driver/${driver1Id}`)
        .set('Authorization', `Bearer ${driver1Token}`)
        .expect(200);
    });

    it('should return 404 for non-existent driver', async () => {
      await request(app.getHttpServer())
        .get('/vehicle-checkins/driver/507f1f77bcf86cd799439011')
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(404);
    });
  });

  describe('GET /vehicle-checkins/vehicle/:vehicleId/status', () => {
    it('should get current vehicle status', async () => {
      // First check in
      await request(app.getHttpServer())
        .post('/vehicle-checkins/checkin')
        .set('Authorization', `Bearer ${driver1Token}`)
        .send({
          ...baseCheckinData,
          vehicleId: testVehicleId,
        });

      const response = await request(app.getHttpServer())
        .get(`/vehicle-checkins/vehicle/${testVehicleId}/status`)
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      expect(response.body).toHaveProperty('isCheckedIn');
      expect(response.body).toHaveProperty('currentDriverId');
      expect(response.body).toHaveProperty('lastCheckinTime');
      expect(response.body.isCheckedIn).toBe(true);
      expect(response.body.currentDriverId).toBe(driver1Id);
    });

    it('should show not checked in status after checkout', async () => {
      // Check out
      await request(app.getHttpServer())
        .post(`/vehicle-checkins/checkout/${testVehicleId}`)
        .set('Authorization', `Bearer ${driver1Token}`)
        .send({});

      const response = await request(app.getHttpServer())
        .get(`/vehicle-checkins/vehicle/${testVehicleId}/status`)
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      expect(response.body.isCheckedIn).toBe(false);
      expect(response.body.currentDriverId).toBe(null);
    });
  });

  describe('GET /vehicle-checkins/driver/:driverId/current-vehicle', () => {
    it('should get driver current vehicle when checked in', async () => {
      // Check in
      await request(app.getHttpServer())
        .post('/vehicle-checkins/checkin')
        .set('Authorization', `Bearer ${driver1Token}`)
        .send({
          ...baseCheckinData,
          vehicleId: testVehicleId,
        });

      const response = await request(app.getHttpServer())
        .get(`/vehicle-checkins/driver/${driver1Id}/current-vehicle`)
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      expect(response.body).toHaveProperty('vehicleId');
      expect(response.body).toHaveProperty('checkinTime');
      expect(response.body).toHaveProperty('location');
      expect(response.body.vehicleId).toBe(testVehicleId);
    });

    it('should return null when driver not checked in', async () => {
      // Check out first
      await request(app.getHttpServer())
        .post(`/vehicle-checkins/checkout/${testVehicleId}`)
        .set('Authorization', `Bearer ${driver1Token}`)
        .send({});

      const response = await request(app.getHttpServer())
        .get(`/vehicle-checkins/driver/${driver1Id}/current-vehicle`)
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      expect(response.body).toBe(null);
    });
  });

  describe('GET /vehicle-checkins/vehicle/:vehicleId/history', () => {
    it('should get vehicle check-in history for specific period', async () => {
      const response = await request(app.getHttpServer())
        .get(`/vehicle-checkins/vehicle/${testVehicleId}/history?days=7`)
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      expect(Array.isArray(response.body)).toBe(true);

      response.body.forEach((checkin) => {
        expect(checkin.vehicleId).toBe(testVehicleId);
        const checkinDate = new Date(checkin.timestamp);
        const weekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
        expect(checkinDate >= weekAgo).toBe(true);
      });
    });

    it('should default to 30 days if no period specified', async () => {
      await request(app.getHttpServer())
        .get(`/vehicle-checkins/vehicle/${testVehicleId}/history`)
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);
    });

    it('should reject access by non-admin/logistics', async () => {
      await request(app.getHttpServer())
        .get(`/vehicle-checkins/vehicle/${testVehicleId}/history`)
        .set('Authorization', `Bearer ${driver1Token}`)
        .expect(403);
    });
  });

  describe('Check-in Workflow Integration', () => {
    it('should complete full check-in/checkout workflow with route', async () => {
      // 1. Check in to vehicle with route
      const checkinResponse = await request(app.getHttpServer())
        .post('/vehicle-checkins/checkin')
        .set('Authorization', `Bearer ${driver1Token}`)
        .send({
          ...baseCheckinData,
          vehicleId: testVehicleId,
          scheduledRouteId: testRouteId,
          notes: 'Starting assigned route',
        })
        .expect(201);

      expect(checkinResponse.body.scheduledRouteId).toBe(testRouteId);
      expect(checkinResponse.body.type).toBe('check_in');

      // 2. Verify vehicle status shows as checked in
      const statusResponse = await request(app.getHttpServer())
        .get(`/vehicle-checkins/vehicle/${testVehicleId}/status`)
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      expect(statusResponse.body.isCheckedIn).toBe(true);
      expect(statusResponse.body.currentDriverId).toBe(driver1Id);

      // 3. Verify driver current vehicle
      const currentVehicleResponse = await request(app.getHttpServer())
        .get(`/vehicle-checkins/driver/${driver1Id}/current-vehicle`)
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      expect(currentVehicleResponse.body.vehicleId).toBe(testVehicleId);

      // 4. Check out from vehicle
      const checkoutResponse = await request(app.getHttpServer())
        .post(`/vehicle-checkins/checkout/${testVehicleId}`)
        .set('Authorization', `Bearer ${driver1Token}`)
        .send({
          notes: 'Route completed successfully, all deliveries made',
        })
        .expect(201);

      expect(checkoutResponse.body.type).toBe('check_out');

      // 5. Verify vehicle status shows as not checked in
      const finalStatusResponse = await request(app.getHttpServer())
        .get(`/vehicle-checkins/vehicle/${testVehicleId}/status`)
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      expect(finalStatusResponse.body.isCheckedIn).toBe(false);
      expect(finalStatusResponse.body.currentDriverId).toBe(null);
    });

    it('should track check-in/checkout pairs correctly', async () => {
      // Perform multiple check-in/checkout cycles
      for (let i = 0; i < 3; i++) {
        // Check in
        await request(app.getHttpServer())
          .post('/vehicle-checkins/checkin')
          .set('Authorization', `Bearer ${driver1Token}`)
          .send({
            ...baseCheckinData,
            vehicleId: testVehicleId,
            notes: `Check-in cycle ${i + 1}`,
          });

        // Check out
        await request(app.getHttpServer())
          .post(`/vehicle-checkins/checkout/${testVehicleId}`)
          .set('Authorization', `Bearer ${driver1Token}`)
          .send({
            notes: `Check-out cycle ${i + 1}`,
          });
      }

      // Verify history shows all cycles
      const historyResponse = await request(app.getHttpServer())
        .get(`/vehicle-checkins/vehicle/${testVehicleId}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      // Should have at least 6 records (3 check-ins + 3 check-outs)
      const recentRecords = historyResponse.body.filter(
        (record) => record.notes && record.notes.includes('cycle'),
      );
      expect(recentRecords.length).toBeGreaterThanOrEqual(6);

      // Verify alternating check-in/check-out pattern
      const sortedRecords = recentRecords.sort(
        (a, b) => new Date(a.timestamp) - new Date(b.timestamp),
      );

      for (let i = 0; i < sortedRecords.length; i += 2) {
        if (i + 1 < sortedRecords.length) {
          expect(sortedRecords[i].type).toBe('check_in');
          expect(sortedRecords[i + 1].type).toBe('check_out');
        }
      }
    });
  });
});

