import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import * as request from 'supertest';
import { AppModule } from '../../src/app.module';

describe('Vehicles (e2e)', () => {
  let app: INestApplication;
  let adminToken: string;
  let logisticsToken: string;
  let driverToken: string;
  let testVehicleId: string;
  let testDriverId: string;

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
  });

  afterAll(async () => {
    await app.close();
  });

  describe('GET /vehicles', () => {
    it('should get all vehicles for admin', async () => {
      const response = await request(app.getHttpServer())
        .get('/vehicles')
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      expect(response.body).toHaveProperty('resumen');
      expect(response.body).toHaveProperty('vehicles');
      expect(Array.isArray(response.body.vehicles)).toBe(true);
      expect(response.body.resumen).toHaveProperty('total');
      expect(response.body.resumen).toHaveProperty('activo');
      expect(response.body.resumen).toHaveProperty('taller');
      expect(response.body.resumen).toHaveProperty('descontinuado');
    });

    it('should get vehicles with status filter', async () => {
      const response = await request(app.getHttpServer())
        .get('/vehicles?status=activo')
        .set('Authorization', `Bearer ${logisticsToken}`)
        .expect(200);

      expect(response.body.vehicles).toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            status: 'activo',
          }),
        ]),
      );
    });

    it('should get available vehicles only', async () => {
      const response = await request(app.getHttpServer())
        .get('/vehicles?available=true')
        .set('Authorization', `Bearer ${logisticsToken}`)
        .expect(200);

      // Check that returned vehicles don't have assignedDriverId
      response.body.vehicles.forEach((vehicle) => {
        expect(vehicle.assignedDriverId).toBeFalsy();
      });
    });

    it('should allow driver to view vehicles', async () => {
      await request(app.getHttpServer())
        .get('/vehicles')
        .set('Authorization', `Bearer ${driverToken}`)
        .expect(200);
    });

    it('should reject unauthenticated requests', async () => {
      await request(app.getHttpServer()).get('/vehicles').expect(401);
    });
  });

  describe('POST /vehicles', () => {
    const testVehicle = {
      plateNumber: 'TEST-123',
      brand: 'Toyota',
      model: 'Hilux',
      year: 2023,
      color: 'Blanco',
      capacity: 3.5,
      fuelType: 'Diesel',
      status: 'activo',
      lastMaintenanceDate: new Date().toISOString(),
      nextMaintenanceDate: new Date(
        Date.now() + 90 * 24 * 60 * 60 * 1000,
      ).toISOString(),
    };

    it('should create vehicle as admin', async () => {
      const response = await request(app.getHttpServer())
        .post('/vehicles')
        .set('Authorization', `Bearer ${adminToken}`)
        .send(testVehicle)
        .expect(201);

      expect(response.body).toHaveProperty('_id');
      expect(response.body.plateNumber).toBe(testVehicle.plateNumber);
      expect(response.body.brand).toBe(testVehicle.brand);
      expect(response.body.model).toBe(testVehicle.model);
      expect(response.body.status).toBe(testVehicle.status);

      testVehicleId = response.body._id;
    });

    it('should create vehicle as logistics', async () => {
      const vehicleData = {
        ...testVehicle,
        plateNumber: 'TEST-456',
      };

      const response = await request(app.getHttpServer())
        .post('/vehicles')
        .set('Authorization', `Bearer ${logisticsToken}`)
        .send(vehicleData)
        .expect(201);

      expect(response.body.plateNumber).toBe(vehicleData.plateNumber);
    });

    it('should reject vehicle creation by driver', async () => {
      await request(app.getHttpServer())
        .post('/vehicles')
        .set('Authorization', `Bearer ${driverToken}`)
        .send({
          ...testVehicle,
          plateNumber: 'TEST-789',
        })
        .expect(403);
    });

    it('should fail with duplicate plate number', async () => {
      await request(app.getHttpServer())
        .post('/vehicles')
        .set('Authorization', `Bearer ${adminToken}`)
        .send(testVehicle)
        .expect(400);
    });

    it('should fail with missing required fields', async () => {
      await request(app.getHttpServer())
        .post('/vehicles')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          brand: 'Ford',
          model: 'Ranger',
          // Missing plateNumber
        })
        .expect(400);
    });

    it('should fail with invalid status', async () => {
      await request(app.getHttpServer())
        .post('/vehicles')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          ...testVehicle,
          plateNumber: 'INVALID-001',
          status: 'invalid-status',
        })
        .expect(400);
    });
  });

  describe('GET /vehicles/:id', () => {
    it('should get vehicle by ID', async () => {
      const response = await request(app.getHttpServer())
        .get(`/vehicles/${testVehicleId}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      expect(response.body._id).toBe(testVehicleId);
      expect(response.body).toHaveProperty('plateNumber');
      expect(response.body).toHaveProperty('brand');
      expect(response.body).toHaveProperty('model');
    });

    it('should return 404 for non-existent vehicle', async () => {
      await request(app.getHttpServer())
        .get('/vehicles/507f1f77bcf86cd799439011')
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(404);
    });
  });

  describe('PATCH /vehicles/:id', () => {
    it('should update vehicle as admin', async () => {
      const updateData = {
        color: 'Azul',
        status: 'taller',
      };

      const response = await request(app.getHttpServer())
        .patch(`/vehicles/${testVehicleId}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send(updateData)
        .expect(200);

      expect(response.body.color).toBe(updateData.color);
      expect(response.body.status).toBe(updateData.status);
    });

    it('should update vehicle as logistics', async () => {
      const updateData = {
        color: 'Verde',
      };

      await request(app.getHttpServer())
        .patch(`/vehicles/${testVehicleId}`)
        .set('Authorization', `Bearer ${logisticsToken}`)
        .send(updateData)
        .expect(200);
    });

    it('should reject update by driver', async () => {
      await request(app.getHttpServer())
        .patch(`/vehicles/${testVehicleId}`)
        .set('Authorization', `Bearer ${driverToken}`)
        .send({ color: 'Rojo' })
        .expect(403);
    });
  });

  describe('PATCH /vehicles/:id/driver-update', () => {
    it('should allow driver to update limited fields', async () => {
      const updateData = {
        mileage: 45000,
        fuelLevel: 75,
        notes: 'Vehicle condition checked',
      };

      const response = await request(app.getHttpServer())
        .patch(`/vehicles/${testVehicleId}/driver-update`)
        .set('Authorization', `Bearer ${driverToken}`)
        .send(updateData)
        .expect(200);

      expect(response.body.mileage).toBe(updateData.mileage);
      expect(response.body.fuelLevel).toBe(updateData.fuelLevel);
    });

    it('should reject unauthorized driver update', async () => {
      await request(app.getHttpServer())
        .patch(`/vehicles/${testVehicleId}/driver-update`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ mileage: 50000 })
        .expect(403);
    });
  });

  describe('Vehicle Assignment', () => {
    describe('PATCH /vehicles/:id/assign', () => {
      it('should assign vehicle to driver as admin', async () => {
        const assignmentData = {
          driverId: testDriverId,
        };

        const response = await request(app.getHttpServer())
          .patch(`/vehicles/${testVehicleId}/assign`)
          .set('Authorization', `Bearer ${adminToken}`)
          .send(assignmentData)
          .expect(200);

        expect(response.body.assignedDriverId).toBe(testDriverId);
      });

      it('should assign vehicle as logistics', async () => {
        // First unassign the vehicle
        await request(app.getHttpServer())
          .patch(`/vehicles/${testVehicleId}/unassign`)
          .set('Authorization', `Bearer ${logisticsToken}`)
          .expect(200);

        const assignmentData = {
          driverId: testDriverId,
        };

        const response = await request(app.getHttpServer())
          .patch(`/vehicles/${testVehicleId}/assign`)
          .set('Authorization', `Bearer ${logisticsToken}`)
          .send(assignmentData)
          .expect(200);

        expect(response.body.assignedDriverId).toBe(testDriverId);
      });

      it('should reject assignment by driver', async () => {
        await request(app.getHttpServer())
          .patch(`/vehicles/${testVehicleId}/assign`)
          .set('Authorization', `Bearer ${driverToken}`)
          .send({ driverId: testDriverId })
          .expect(403);
      });
    });

    describe('PATCH /vehicles/:id/unassign', () => {
      it('should unassign vehicle from driver', async () => {
        const response = await request(app.getHttpServer())
          .patch(`/vehicles/${testVehicleId}/unassign`)
          .set('Authorization', `Bearer ${adminToken}`)
          .expect(200);

        expect(response.body.assignedDriverId).toBe(null);
      });
    });
  });

  describe('PATCH /vehicles/:id/retire', () => {
    it('should retire vehicle as admin', async () => {
      const response = await request(app.getHttpServer())
        .patch(`/vehicles/${testVehicleId}/retire`)
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      expect(response.body.status).toBe('descontinuado');
    });

    it('should reject retire by non-admin', async () => {
      await request(app.getHttpServer())
        .patch(`/vehicles/${testVehicleId}/retire`)
        .set('Authorization', `Bearer ${logisticsToken}`)
        .expect(403);
    });
  });

  describe('DELETE /vehicles/:id', () => {
    it('should delete vehicle as admin only', async () => {
      await request(app.getHttpServer())
        .delete(`/vehicles/${testVehicleId}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);
    });

    it('should reject delete by non-admin', async () => {
      // Create another vehicle first
      const vehicleResponse = await request(app.getHttpServer())
        .post('/vehicles')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          plateNumber: 'DELETE-TEST',
          brand: 'Test',
          model: 'Delete',
          year: 2023,
          color: 'Test',
          capacity: 1.0,
          fuelType: 'Diesel',
          status: 'activo',
          lastMaintenanceDate: new Date().toISOString(),
        });

      await request(app.getHttpServer())
        .delete(`/vehicles/${vehicleResponse.body._id}`)
        .set('Authorization', `Bearer ${logisticsToken}`)
        .expect(403);

      await request(app.getHttpServer())
        .delete(`/vehicles/${vehicleResponse.body._id}`)
        .set('Authorization', `Bearer ${driverToken}`)
        .expect(403);
    });

    it('should return 404 for non-existent vehicle', async () => {
      await request(app.getHttpServer())
        .delete('/vehicles/507f1f77bcf86cd799439011')
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(404);
    });
  });

  describe('Vehicle Status and Filtering', () => {
    let activeVehicleId: string;

    beforeAll(async () => {
      // Create a test vehicle for status tests
      const vehicleResponse = await request(app.getHttpServer())
        .post('/vehicles')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          plateNumber: 'STATUS-TEST',
          brand: 'Status',
          model: 'Test',
          year: 2023,
          color: 'Test',
          capacity: 2.0,
          fuelType: 'Gasolina',
          status: 'activo',
          lastMaintenanceDate: new Date().toISOString(),
        });
      activeVehicleId = vehicleResponse.body._id;
    });

    it('should filter vehicles by driver assignment', async () => {
      // First assign the vehicle to a driver
      await request(app.getHttpServer())
        .patch(`/vehicles/${activeVehicleId}/assign`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ driverId: testDriverId });

      // Then filter by driver ID
      const response = await request(app.getHttpServer())
        .get(`/vehicles?driverId=${testDriverId}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      expect(response.body.vehicles).toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            assignedDriverId: testDriverId,
          }),
        ]),
      );
    });

    it('should get vehicle summary counts', async () => {
      const response = await request(app.getHttpServer())
        .get('/vehicles')
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      expect(response.body.resumen).toMatchObject({
        total: expect.any(Number),
        activo: expect.any(Number),
        taller: expect.any(Number),
        descontinuado: expect.any(Number),
      });

      expect(response.body.resumen.total).toBeGreaterThanOrEqual(
        response.body.resumen.activo +
          response.body.resumen.taller +
          response.body.resumen.descontinuado,
      );
    });
  });
});

