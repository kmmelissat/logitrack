import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import * as request from 'supertest';
import { AppModule } from '../../src/app.module';

describe('Routes and Route Points (e2e)', () => {
  let app: INestApplication;
  let adminToken: string;
  let logisticsToken: string;
  let driverToken: string;
  let testVehicleId: string;
  let testDriverId: string;
  let testRouteId: string;
  let testRoutePointId: string;

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
    testDriverId = driverResponse.body.user._id;

    // Create and assign a test vehicle
    const vehicleResponse = await request(app.getHttpServer())
      .post('/vehicles')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        plateNumber: 'ROUTE-TEST-001',
        brand: 'Ford',
        model: 'Ranger',
        year: 2023,
        color: 'Azul',
        capacity: 2.5,
        fuelType: 'Diesel',
        status: 'activo',
        lastMaintenanceDate: new Date().toISOString(),
      });
    testVehicleId = vehicleResponse.body._id;

    // Assign vehicle to driver
    await request(app.getHttpServer())
      .patch(`/vehicles/${testVehicleId}/assign`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ driverId: testDriverId });
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

  describe('GET /scheduled-routes/available-resources', () => {
    it('should get available vehicles with assigned drivers', async () => {
      const response = await request(app.getHttpServer())
        .get('/scheduled-routes/available-vehicles')
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      expect(Array.isArray(response.body)).toBe(true);

      // Should include our test vehicle
      const testVehicle = response.body.find((v) => v._id === testVehicleId);
      if (testVehicle) {
        expect(testVehicle).toHaveProperty('assignedDriverId');
        expect(testVehicle.status).toBe('activo');
      }
    });

    it('should get available drivers', async () => {
      const response = await request(app.getHttpServer())
        .get('/scheduled-routes/available-drivers')
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      expect(Array.isArray(response.body)).toBe(true);

      // Should include our test driver
      const testDriver = response.body.find((d) => d._id === testDriverId);
      if (testDriver) {
        expect(testDriver.role).toBe('conductor');
        expect(testDriver).toHaveProperty('firstName');
        expect(testDriver).toHaveProperty('lastName');
      }
    });

    it('should allow logistics to access available resources', async () => {
      await request(app.getHttpServer())
        .get('/scheduled-routes/available-vehicles')
        .set('Authorization', `Bearer ${logisticsToken}`)
        .expect(200);

      await request(app.getHttpServer())
        .get('/scheduled-routes/available-drivers')
        .set('Authorization', `Bearer ${logisticsToken}`)
        .expect(200);
    });

    it('should reject driver access to resource lists', async () => {
      await request(app.getHttpServer())
        .get('/scheduled-routes/available-vehicles')
        .set('Authorization', `Bearer ${driverToken}`)
        .expect(403);
    });
  });

  describe('POST /scheduled-routes', () => {
    const baseRouteData = {
      name: 'Test Route San Salvador - Santa Ana',
      description: 'Test route for e2e testing',
      plannedStartDate: new Date(
        Date.now() + 24 * 60 * 60 * 1000,
      ).toISOString(), // Tomorrow
      plannedEndDate: new Date(Date.now() + 36 * 60 * 60 * 1000).toISOString(), // Tomorrow + 12 hours
      origin: 'Terminal San Salvador',
      destination: 'Terminal Santa Ana',
      estimatedDistance: 65,
      estimatedCost: 150,
      notes: 'Test route created by e2e tests',
    };

    it('should create scheduled route as admin', async () => {
      const routeData = {
        ...baseRouteData,
        vehicleId: testVehicleId,
        driverId: testDriverId,
      };

      const response = await request(app.getHttpServer())
        .post('/scheduled-routes')
        .set('Authorization', `Bearer ${adminToken}`)
        .send(routeData)
        .expect(201);

      expect(response.body).toHaveProperty('_id');
      expect(response.body.name).toBe(routeData.name);
      expect(response.body.vehicleId).toBe(testVehicleId);
      expect(response.body.driverId).toBe(testDriverId);
      expect(response.body.status).toBe('planificada');

      testRouteId = response.body._id;
    });

    it('should create scheduled route as logistics', async () => {
      const routeData = {
        ...baseRouteData,
        name: 'Logistics Test Route',
        vehicleId: testVehicleId,
        driverId: testDriverId,
        plannedStartDate: new Date(
          Date.now() + 48 * 60 * 60 * 1000,
        ).toISOString(),
        plannedEndDate: new Date(
          Date.now() + 60 * 60 * 60 * 1000,
        ).toISOString(),
      };

      await request(app.getHttpServer())
        .post('/scheduled-routes')
        .set('Authorization', `Bearer ${logisticsToken}`)
        .send(routeData)
        .expect(201);
    });

    it('should reject route creation by driver', async () => {
      await request(app.getHttpServer())
        .post('/scheduled-routes')
        .set('Authorization', `Bearer ${driverToken}`)
        .send({
          ...baseRouteData,
          vehicleId: testVehicleId,
          driverId: testDriverId,
        })
        .expect(403);
    });

    it('should fail with invalid date range', async () => {
      const invalidRouteData = {
        ...baseRouteData,
        vehicleId: testVehicleId,
        driverId: testDriverId,
        plannedStartDate: new Date(
          Date.now() + 48 * 60 * 60 * 1000,
        ).toISOString(),
        plannedEndDate: new Date(
          Date.now() + 24 * 60 * 60 * 1000,
        ).toISOString(), // End before start
      };

      await request(app.getHttpServer())
        .post('/scheduled-routes')
        .set('Authorization', `Bearer ${adminToken}`)
        .send(invalidRouteData)
        .expect(400);
    });

    it('should fail with past date', async () => {
      const pastRouteData = {
        ...baseRouteData,
        vehicleId: testVehicleId,
        driverId: testDriverId,
        plannedStartDate: new Date(
          Date.now() - 24 * 60 * 60 * 1000,
        ).toISOString(), // Yesterday
        plannedEndDate: new Date(
          Date.now() - 12 * 60 * 60 * 1000,
        ).toISOString(),
      };

      await request(app.getHttpServer())
        .post('/scheduled-routes')
        .set('Authorization', `Bearer ${adminToken}`)
        .send(pastRouteData)
        .expect(400);
    });

    it('should fail with non-existent vehicle', async () => {
      await request(app.getHttpServer())
        .post('/scheduled-routes')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          ...baseRouteData,
          vehicleId: '507f1f77bcf86cd799439011',
          driverId: testDriverId,
        })
        .expect(404);
    });

    it('should fail with missing required fields', async () => {
      await request(app.getHttpServer())
        .post('/scheduled-routes')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          name: 'Incomplete Route',
          // Missing other required fields
        })
        .expect(400);
    });
  });

  describe('GET /scheduled-routes', () => {
    it('should get all scheduled routes with pagination', async () => {
      const response = await request(app.getHttpServer())
        .get('/scheduled-routes?page=1&limit=10')
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      expect(response.body).toHaveProperty('data');
      expect(response.body).toHaveProperty('pagination');
      expect(Array.isArray(response.body.data)).toBe(true);
      expect(response.body.pagination).toHaveProperty('currentPage');
      expect(response.body.pagination).toHaveProperty('totalPages');
      expect(response.body.pagination).toHaveProperty('totalItems');
    });

    it('should filter routes by status', async () => {
      const response = await request(app.getHttpServer())
        .get('/scheduled-routes?status=planificada')
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      response.body.data.forEach((route) => {
        expect(route.status).toBe('planificada');
      });
    });

    it('should filter routes by vehicle', async () => {
      const response = await request(app.getHttpServer())
        .get(`/scheduled-routes?vehicleId=${testVehicleId}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      response.body.data.forEach((route) => {
        expect(route.vehicleId._id || route.vehicleId).toBe(testVehicleId);
      });
    });

    it('should filter routes by driver', async () => {
      const response = await request(app.getHttpServer())
        .get(`/scheduled-routes?driverId=${testDriverId}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      response.body.data.forEach((route) => {
        expect(route.driverId._id || route.driverId).toBe(testDriverId);
      });
    });

    it('should allow driver to see assigned routes', async () => {
      await request(app.getHttpServer())
        .get('/scheduled-routes')
        .set('Authorization', `Bearer ${driverToken}`)
        .expect(200);
    });
  });

  describe('GET /scheduled-routes/:id', () => {
    it('should get route by ID', async () => {
      const response = await request(app.getHttpServer())
        .get(`/scheduled-routes/${testRouteId}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      expect(response.body._id).toBe(testRouteId);
      expect(response.body).toHaveProperty('name');
      expect(response.body).toHaveProperty('vehicleId');
      expect(response.body).toHaveProperty('driverId');
    });

    it('should return 404 for non-existent route', async () => {
      await request(app.getHttpServer())
        .get('/scheduled-routes/507f1f77bcf86cd799439011')
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(404);
    });
  });

  describe('PATCH /scheduled-routes/:id', () => {
    it('should update route status', async () => {
      const updateData = {
        status: 'en_progreso',
        notes: 'Route started as planned',
      };

      const response = await request(app.getHttpServer())
        .patch(`/scheduled-routes/${testRouteId}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send(updateData)
        .expect(200);

      expect(response.body.status).toBe('en_progreso');
      expect(response.body.notes).toBe(updateData.notes);
    });

    it('should update route details as logistics', async () => {
      const updateData = {
        estimatedCost: 200,
        notes: 'Cost updated due to fuel price changes',
      };

      await request(app.getHttpServer())
        .patch(`/scheduled-routes/${testRouteId}`)
        .set('Authorization', `Bearer ${logisticsToken}`)
        .send(updateData)
        .expect(200);
    });

    it('should reject update by driver', async () => {
      await request(app.getHttpServer())
        .patch(`/scheduled-routes/${testRouteId}`)
        .set('Authorization', `Bearer ${driverToken}`)
        .send({ notes: 'Driver attempted update' })
        .expect(403);
    });
  });

  describe('Route Points Management', () => {
    describe('POST /route-points', () => {
      const basePointData = {
        name: 'Test Checkpoint',
        description: 'Test checkpoint for e2e testing',
        type: 'parada',
        latitude: 13.7167,
        longitude: -89.2167,
        address: 'Santa Ana Centro',
        sequenceOrder: 1,
        plannedArrivalTime: new Date(
          Date.now() + 26 * 60 * 60 * 1000,
        ).toISOString(),
        plannedDepartureTime: new Date(
          Date.now() + 27 * 60 * 60 * 1000,
        ).toISOString(),
        estimatedStayMinutes: 30,
        notes: 'Test checkpoint created by e2e tests',
      };

      it('should create route point as admin', async () => {
        const pointData = {
          ...basePointData,
          scheduledRouteId: testRouteId,
        };

        const response = await request(app.getHttpServer())
          .post('/route-points')
          .set('Authorization', `Bearer ${adminToken}`)
          .send(pointData)
          .expect(201);

        expect(response.body).toHaveProperty('_id');
        expect(response.body.name).toBe(pointData.name);
        expect(response.body.type).toBe(pointData.type);
        expect(response.body.scheduledRouteId).toBe(testRouteId);
        expect(response.body.latitude).toBe(pointData.latitude);
        expect(response.body.longitude).toBe(pointData.longitude);

        testRoutePointId = response.body._id;
      });

      it('should create different types of route points', async () => {
        const pointTypes = ['origen', 'destino', 'parada', 'checkpoint'];

        for (let i = 0; i < pointTypes.length; i++) {
          const pointType = pointTypes[i];
          const pointData = {
            ...basePointData,
            name: `Test ${pointType}`,
            type: pointType,
            scheduledRouteId: testRouteId,
            sequenceOrder: i + 2,
            latitude: 13.7167 + i * 0.01,
            longitude: -89.2167 + i * 0.01,
          };

          const response = await request(app.getHttpServer())
            .post('/route-points')
            .set('Authorization', `Bearer ${adminToken}`)
            .send(pointData)
            .expect(201);

          expect(response.body.type).toBe(pointType);
        }
      });

      it('should create route point as logistics', async () => {
        const pointData = {
          ...basePointData,
          name: 'Logistics Checkpoint',
          scheduledRouteId: testRouteId,
          sequenceOrder: 10,
        };

        await request(app.getHttpServer())
          .post('/route-points')
          .set('Authorization', `Bearer ${logisticsToken}`)
          .send(pointData)
          .expect(201);
      });

      it('should reject route point creation by driver', async () => {
        await request(app.getHttpServer())
          .post('/route-points')
          .set('Authorization', `Bearer ${driverToken}`)
          .send({
            ...basePointData,
            scheduledRouteId: testRouteId,
          })
          .expect(403);
      });

      it('should fail with invalid coordinates', async () => {
        await request(app.getHttpServer())
          .post('/route-points')
          .set('Authorization', `Bearer ${adminToken}`)
          .send({
            ...basePointData,
            scheduledRouteId: testRouteId,
            latitude: 200, // Invalid latitude
          })
          .expect(400);
      });

      it('should fail with invalid point type', async () => {
        await request(app.getHttpServer())
          .post('/route-points')
          .set('Authorization', `Bearer ${adminToken}`)
          .send({
            ...basePointData,
            scheduledRouteId: testRouteId,
            type: 'invalid_type',
          })
          .expect(400);
      });
    });

    describe('GET /route-points', () => {
      it('should get route points for specific route', async () => {
        const response = await request(app.getHttpServer())
          .get(`/route-points?routeId=${testRouteId}`)
          .set('Authorization', `Bearer ${adminToken}`)
          .expect(200);

        expect(Array.isArray(response.body)).toBe(true);

        response.body.forEach((point) => {
          expect(point.scheduledRouteId).toBe(testRouteId);
        });
      });

      it('should get route points ordered by sequence', async () => {
        const response = await request(app.getHttpServer())
          .get(`/route-points?routeId=${testRouteId}`)
          .set('Authorization', `Bearer ${adminToken}`)
          .expect(200);

        // Check if points are ordered by sequenceOrder
        for (let i = 1; i < response.body.length; i++) {
          expect(response.body[i].sequenceOrder).toBeGreaterThanOrEqual(
            response.body[i - 1].sequenceOrder,
          );
        }
      });

      it('should allow driver to view route points', async () => {
        await request(app.getHttpServer())
          .get(`/route-points?routeId=${testRouteId}`)
          .set('Authorization', `Bearer ${driverToken}`)
          .expect(200);
      });
    });

    describe('PATCH /route-points/:id', () => {
      it('should update route point', async () => {
        const updateData = {
          notes: 'Updated checkpoint notes',
          estimatedStayMinutes: 45,
        };

        const response = await request(app.getHttpServer())
          .patch(`/route-points/${testRoutePointId}`)
          .set('Authorization', `Bearer ${adminToken}`)
          .send(updateData)
          .expect(200);

        expect(response.body.notes).toBe(updateData.notes);
        expect(response.body.estimatedStayMinutes).toBe(
          updateData.estimatedStayMinutes,
        );
      });

      it('should reject update by driver', async () => {
        await request(app.getHttpServer())
          .patch(`/route-points/${testRoutePointId}`)
          .set('Authorization', `Bearer ${driverToken}`)
          .send({ notes: 'Driver update attempt' })
          .expect(403);
      });
    });

    describe('DELETE /route-points/:id', () => {
      it('should delete route point as admin', async () => {
        // Create a point to delete
        const pointData = {
          name: 'To Delete Point',
          description: 'This point will be deleted',
          type: 'parada',
          latitude: 13.7,
          longitude: -89.2,
          address: 'Delete Test Address',
          sequenceOrder: 99,
          scheduledRouteId: testRouteId,
          plannedArrivalTime: new Date(
            Date.now() + 30 * 60 * 60 * 1000,
          ).toISOString(),
          plannedDepartureTime: new Date(
            Date.now() + 31 * 60 * 60 * 1000,
          ).toISOString(),
          estimatedStayMinutes: 15,
        };

        const createResponse = await request(app.getHttpServer())
          .post('/route-points')
          .set('Authorization', `Bearer ${adminToken}`)
          .send(pointData);

        const pointToDeleteId = createResponse.body._id;

        await request(app.getHttpServer())
          .delete(`/route-points/${pointToDeleteId}`)
          .set('Authorization', `Bearer ${adminToken}`)
          .expect(200);

        // Verify deletion
        await request(app.getHttpServer())
          .get(`/route-points/${pointToDeleteId}`)
          .set('Authorization', `Bearer ${adminToken}`)
          .expect(404);
      });

      it('should reject deletion by driver', async () => {
        await request(app.getHttpServer())
          .delete(`/route-points/${testRoutePointId}`)
          .set('Authorization', `Bearer ${driverToken}`)
          .expect(403);
      });
    });
  });

  describe('Route Status Workflow', () => {
    it('should complete full route workflow', async () => {
      // Create a new route for workflow testing
      const routeData = {
        name: 'Workflow Test Route',
        description: 'Route to test complete workflow',
        plannedStartDate: new Date(
          Date.now() + 72 * 60 * 60 * 1000,
        ).toISOString(),
        plannedEndDate: new Date(
          Date.now() + 84 * 60 * 60 * 1000,
        ).toISOString(),
        origin: 'Terminal Workflow',
        destination: 'Terminal End',
        estimatedDistance: 50,
        estimatedCost: 120,
        vehicleId: testVehicleId,
        driverId: testDriverId,
        notes: 'Workflow test route',
      };

      const createResponse = await request(app.getHttpServer())
        .post('/scheduled-routes')
        .set('Authorization', `Bearer ${adminToken}`)
        .send(routeData)
        .expect(201);

      const workflowRouteId = createResponse.body._id;
      expect(createResponse.body.status).toBe('planificada');

      // Start the route
      const startResponse = await request(app.getHttpServer())
        .patch(`/scheduled-routes/${workflowRouteId}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          status: 'en_progreso',
          actualStartDate: new Date().toISOString(),
          notes: 'Route started successfully',
        })
        .expect(200);

      expect(startResponse.body.status).toBe('en_progreso');

      // Complete the route
      const completeResponse = await request(app.getHttpServer())
        .patch(`/scheduled-routes/${workflowRouteId}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          status: 'completada',
          actualEndDate: new Date().toISOString(),
          actualDistance: 52,
          actualCost: 125,
          notes: 'Route completed successfully',
        })
        .expect(200);

      expect(completeResponse.body.status).toBe('completada');
    });
  });
});

