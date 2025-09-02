import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import * as request from 'supertest';
import { AppModule } from '../../src/app.module';

describe('Maintenance (e2e)', () => {
  let app: INestApplication;
  let adminToken: string;
  let logisticsToken: string;
  let driverToken: string;
  let testVehicleId: string;
  let testMaintenanceId: string;

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
        email: 'conductor2@logitrack.com',
        password: 'conductor123',
      });
    driverToken = driverResponse.body.token;

    // Create a test vehicle for maintenance
    const vehicleResponse = await request(app.getHttpServer())
      .post('/vehicles')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        plateNumber: 'MAINT-TEST-001',
        brand: 'Chevrolet',
        model: 'Colorado',
        year: 2022,
        color: 'Rojo',
        capacity: 3.0,
        fuelType: 'Diesel',
        status: 'activo',
        mileage: 25000,
        lastMaintenanceDate: new Date(
          Date.now() - 60 * 24 * 60 * 60 * 1000,
        ).toISOString(), // 60 days ago
        nextMaintenanceDate: new Date(
          Date.now() + 30 * 24 * 60 * 60 * 1000,
        ).toISOString(), // 30 days from now
      });
    testVehicleId = vehicleResponse.body._id;
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

  describe('POST /maintenance/vehicles/:vehicleId/maintenance', () => {
    const baseMaintenanceData = {
      type: 'preventivo',
      description: 'Mantenimiento preventivo programado',
      scheduledDate: new Date(
        Date.now() + 7 * 24 * 60 * 60 * 1000,
      ).toISOString(), // 7 days from now
      estimatedCost: 250,
      priority: 'media',
      serviceProvider: 'Taller Central',
      notes: 'Mantenimiento programado según intervalos del fabricante',
      maintenanceItems: [
        {
          item: 'Cambio de aceite',
          description: 'Cambio de aceite de motor y filtro',
          estimatedCost: 75,
        },
        {
          item: 'Revisión de frenos',
          description: 'Inspección y ajuste del sistema de frenos',
          estimatedCost: 50,
        },
        {
          item: 'Rotación de neumáticos',
          description: 'Rotación y balanceo de neumáticos',
          estimatedCost: 30,
        },
      ],
    };

    it('should create maintenance record as admin', async () => {
      const response = await request(app.getHttpServer())
        .post(`/maintenance/vehicles/${testVehicleId}/maintenance`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send(baseMaintenanceData)
        .expect(201);

      expect(response.body).toHaveProperty('_id');
      expect(response.body.vehicleId).toBe(testVehicleId);
      expect(response.body.type).toBe(baseMaintenanceData.type);
      expect(response.body.description).toBe(baseMaintenanceData.description);
      expect(response.body.status).toBe('programado');
      expect(response.body.estimatedCost).toBe(
        baseMaintenanceData.estimatedCost,
      );
      expect(Array.isArray(response.body.maintenanceItems)).toBe(true);
      expect(response.body.maintenanceItems).toHaveLength(3);

      testMaintenanceId = response.body._id;
    });

    it('should create maintenance record as logistics', async () => {
      const maintenanceData = {
        ...baseMaintenanceData,
        type: 'correctivo',
        description: 'Reparación de falla reportada',
        priority: 'alta',
        scheduledDate: new Date(
          Date.now() + 2 * 24 * 60 * 60 * 1000,
        ).toISOString(),
      };

      const response = await request(app.getHttpServer())
        .post(`/maintenance/vehicles/${testVehicleId}/maintenance`)
        .set('Authorization', `Bearer ${logisticsToken}`)
        .send(maintenanceData)
        .expect(201);

      expect(response.body.type).toBe('correctivo');
      expect(response.body.priority).toBe('alta');
    });

    it('should create emergency maintenance', async () => {
      const emergencyData = {
        ...baseMaintenanceData,
        type: 'emergencia',
        priority: 'critica',
        description: 'Falla crítica en el motor',
        scheduledDate: new Date().toISOString(), // Immediate
        maintenanceItems: [
          {
            item: 'Diagnóstico de motor',
            description: 'Diagnóstico completo del sistema de motor',
            estimatedCost: 150,
          },
          {
            item: 'Reparación de emergencia',
            description: 'Reparación inmediata según diagnóstico',
            estimatedCost: 500,
          },
        ],
      };

      const response = await request(app.getHttpServer())
        .post(`/maintenance/vehicles/${testVehicleId}/maintenance`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send(emergencyData)
        .expect(201);

      expect(response.body.type).toBe('emergencia');
      expect(response.body.priority).toBe('critica');
    });

    it('should reject maintenance creation by driver', async () => {
      await request(app.getHttpServer())
        .post(`/maintenance/vehicles/${testVehicleId}/maintenance`)
        .set('Authorization', `Bearer ${driverToken}`)
        .send(baseMaintenanceData)
        .expect(403);
    });

    it('should fail with invalid maintenance type', async () => {
      await request(app.getHttpServer())
        .post(`/maintenance/vehicles/${testVehicleId}/maintenance`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          ...baseMaintenanceData,
          type: 'invalid_type',
        })
        .expect(400);
    });

    it('should fail with invalid priority', async () => {
      await request(app.getHttpServer())
        .post(`/maintenance/vehicles/${testVehicleId}/maintenance`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          ...baseMaintenanceData,
          priority: 'invalid_priority',
        })
        .expect(400);
    });

    it('should fail with past scheduled date for non-emergency', async () => {
      await request(app.getHttpServer())
        .post(`/maintenance/vehicles/${testVehicleId}/maintenance`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          ...baseMaintenanceData,
          scheduledDate: new Date(
            Date.now() - 24 * 60 * 60 * 1000,
          ).toISOString(), // Yesterday
        })
        .expect(400);
    });

    it('should fail with missing required fields', async () => {
      await request(app.getHttpServer())
        .post(`/maintenance/vehicles/${testVehicleId}/maintenance`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          description: 'Incomplete maintenance',
          // Missing type, scheduledDate, etc.
        })
        .expect(400);
    });

    it('should fail with non-existent vehicle', async () => {
      await request(app.getHttpServer())
        .post('/maintenance/vehicles/507f1f77bcf86cd799439011/maintenance')
        .set('Authorization', `Bearer ${adminToken}`)
        .send(baseMaintenanceData)
        .expect(404);
    });
  });

  describe('GET /maintenance/vehicles/:vehicleId/maintenance', () => {
    it('should get maintenance history for vehicle as admin', async () => {
      const response = await request(app.getHttpServer())
        .get(`/maintenance/vehicles/${testVehicleId}/maintenance`)
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      expect(response.body).toHaveProperty('vehicle');
      expect(response.body).toHaveProperty('maintenanceHistory');
      expect(response.body).toHaveProperty('summary');
      expect(Array.isArray(response.body.maintenanceHistory)).toBe(true);
      expect(response.body.vehicle._id).toBe(testVehicleId);
    });

    it('should get maintenance history as logistics', async () => {
      await request(app.getHttpServer())
        .get(`/maintenance/vehicles/${testVehicleId}/maintenance`)
        .set('Authorization', `Bearer ${logisticsToken}`)
        .expect(200);
    });

    it('should allow driver to view maintenance history', async () => {
      await request(app.getHttpServer())
        .get(`/maintenance/vehicles/${testVehicleId}/maintenance`)
        .set('Authorization', `Bearer ${driverToken}`)
        .expect(200);
    });

    it('should return 404 for non-existent vehicle', async () => {
      await request(app.getHttpServer())
        .get('/maintenance/vehicles/507f1f77bcf86cd799439011/maintenance')
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(404);
    });
  });

  describe('GET /maintenance', () => {
    it('should get all maintenance records', async () => {
      const response = await request(app.getHttpServer())
        .get('/maintenance')
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      expect(Array.isArray(response.body)).toBe(true);
    });

    it('should filter maintenance by vehicle', async () => {
      const response = await request(app.getHttpServer())
        .get(`/maintenance?vehicleId=${testVehicleId}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      // Should return the same as the vehicle-specific endpoint
      expect(response.body).toHaveProperty('vehicle');
      expect(response.body).toHaveProperty('maintenanceHistory');
    });

    it('should filter maintenance by type', async () => {
      const response = await request(app.getHttpServer())
        .get('/maintenance?type=preventivo')
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      expect(Array.isArray(response.body)).toBe(true);
      response.body.forEach((maintenance) => {
        expect(maintenance.type).toBe('preventivo');
      });
    });

    it('should get pending maintenance', async () => {
      const response = await request(app.getHttpServer())
        .get('/maintenance?pending=true')
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      expect(Array.isArray(response.body)).toBe(true);
      response.body.forEach((maintenance) => {
        expect(['programado', 'en_progreso']).toContain(maintenance.status);
      });
    });
  });

  describe('GET /maintenance/:id', () => {
    it('should get maintenance record by ID', async () => {
      const response = await request(app.getHttpServer())
        .get(`/maintenance/${testMaintenanceId}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      expect(response.body._id).toBe(testMaintenanceId);
      expect(response.body).toHaveProperty('vehicleId');
      expect(response.body).toHaveProperty('type');
      expect(response.body).toHaveProperty('description');
      expect(response.body).toHaveProperty('status');
    });

    it('should allow logistics to view maintenance details', async () => {
      await request(app.getHttpServer())
        .get(`/maintenance/${testMaintenanceId}`)
        .set('Authorization', `Bearer ${logisticsToken}`)
        .expect(200);
    });

    it('should allow driver to view maintenance details', async () => {
      await request(app.getHttpServer())
        .get(`/maintenance/${testMaintenanceId}`)
        .set('Authorization', `Bearer ${driverToken}`)
        .expect(200);
    });

    it('should return 404 for non-existent maintenance', async () => {
      await request(app.getHttpServer())
        .get('/maintenance/507f1f77bcf86cd799439011')
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(404);
    });
  });

  describe('PATCH /maintenance/:id', () => {
    it('should update maintenance status as admin', async () => {
      const updateData = {
        status: 'en_progreso',
        actualStartDate: new Date().toISOString(),
        notes: 'Mantenimiento iniciado en el taller',
      };

      const response = await request(app.getHttpServer())
        .patch(`/maintenance/${testMaintenanceId}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send(updateData)
        .expect(200);

      expect(response.body.status).toBe('en_progreso');
      expect(response.body.actualStartDate).toBeDefined();
    });

    it('should complete maintenance with costs and details', async () => {
      const completionData = {
        status: 'completado',
        actualEndDate: new Date().toISOString(),
        actualCost: 280,
        notes: 'Mantenimiento completado exitosamente',
        completedItems: [
          {
            item: 'Cambio de aceite',
            actualCost: 80,
            completed: true,
            notes: 'Aceite sintético utilizado',
          },
          {
            item: 'Revisión de frenos',
            actualCost: 60,
            completed: true,
            notes: 'Pastillas reemplazadas',
          },
          {
            item: 'Rotación de neumáticos',
            actualCost: 35,
            completed: true,
            notes: 'Neumáticos balanceados',
          },
        ],
      };

      const response = await request(app.getHttpServer())
        .patch(`/maintenance/${testMaintenanceId}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send(completionData)
        .expect(200);

      expect(response.body.status).toBe('completado');
      expect(response.body.actualCost).toBe(280);
      expect(Array.isArray(response.body.completedItems)).toBe(true);
    });

    it('should update maintenance as logistics', async () => {
      // Create another maintenance to update
      const maintenanceData = {
        type: 'preventivo',
        description: 'Mantenimiento para actualizar',
        scheduledDate: new Date(
          Date.now() + 5 * 24 * 60 * 60 * 1000,
        ).toISOString(),
        estimatedCost: 150,
        priority: 'baja',
        serviceProvider: 'Taller Norte',
      };

      const createResponse = await request(app.getHttpServer())
        .post(`/maintenance/vehicles/${testVehicleId}/maintenance`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send(maintenanceData);

      const maintenanceToUpdate = createResponse.body._id;

      const updateData = {
        priority: 'media',
        estimatedCost: 180,
        notes: 'Actualizado por logística',
      };

      await request(app.getHttpServer())
        .patch(`/maintenance/${maintenanceToUpdate}`)
        .set('Authorization', `Bearer ${logisticsToken}`)
        .send(updateData)
        .expect(200);
    });

    it('should reject update by driver', async () => {
      await request(app.getHttpServer())
        .patch(`/maintenance/${testMaintenanceId}`)
        .set('Authorization', `Bearer ${driverToken}`)
        .send({ notes: 'Driver attempted update' })
        .expect(403);
    });

    it('should fail with invalid status transition', async () => {
      // Try to change from completed back to programmed
      await request(app.getHttpServer())
        .patch(`/maintenance/${testMaintenanceId}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ status: 'programado' })
        .expect(400);
    });

    it('should fail with invalid status', async () => {
      await request(app.getHttpServer())
        .patch(`/maintenance/${testMaintenanceId}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ status: 'invalid_status' })
        .expect(400);
    });
  });

  describe('Maintenance Scheduling and Alerts', () => {
    it('should identify overdue maintenance', async () => {
      // Create overdue maintenance
      const overdueData = {
        type: 'preventivo',
        description: 'Mantenimiento vencido',
        scheduledDate: new Date(
          Date.now() - 5 * 24 * 60 * 60 * 1000,
        ).toISOString(), // 5 days ago
        estimatedCost: 200,
        priority: 'alta',
        status: 'programado',
      };

      const response = await request(app.getHttpServer())
        .post(`/maintenance/vehicles/${testVehicleId}/maintenance`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send(overdueData)
        .expect(201);

      // Get pending maintenance and check if overdue is flagged
      const pendingResponse = await request(app.getHttpServer())
        .get('/maintenance?pending=true')
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      const overdueItem = pendingResponse.body.find(
        (m) => m._id === response.body._id,
      );
      expect(overdueItem).toBeDefined();
      expect(new Date(overdueItem.scheduledDate).getTime()).toBeLessThan(
        new Date().getTime(),
      );
    });

    it('should track maintenance by priority', async () => {
      // Create maintenance with different priorities
      const priorities = ['baja', 'media', 'alta', 'critica'];

      for (const priority of priorities) {
        const maintenanceData = {
          type: 'preventivo',
          description: `Mantenimiento prioridad ${priority}`,
          scheduledDate: new Date(
            Date.now() + 10 * 24 * 60 * 60 * 1000,
          ).toISOString(),
          estimatedCost: 100,
          priority,
        };

        await request(app.getHttpServer())
          .post(`/maintenance/vehicles/${testVehicleId}/maintenance`)
          .set('Authorization', `Bearer ${adminToken}`)
          .send(maintenanceData)
          .expect(201);
      }

      // Get all maintenance for the vehicle
      const response = await request(app.getHttpServer())
        .get(`/maintenance/vehicles/${testVehicleId}/maintenance`)
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      // Check that we have maintenance with different priorities
      const prioritiesFound = response.body.maintenanceHistory.map(
        (m) => m.priority,
      );
      priorities.forEach((priority) => {
        expect(prioritiesFound).toContain(priority);
      });
    });

    it('should calculate maintenance summary statistics', async () => {
      const response = await request(app.getHttpServer())
        .get(`/maintenance/vehicles/${testVehicleId}/maintenance`)
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      expect(response.body.summary).toHaveProperty('totalMaintenances');
      expect(response.body.summary).toHaveProperty('completedMaintenances');
      expect(response.body.summary).toHaveProperty('pendingMaintenances');
      expect(response.body.summary).toHaveProperty('totalCost');
      expect(response.body.summary).toHaveProperty('averageCost');

      expect(typeof response.body.summary.totalMaintenances).toBe('number');
      expect(typeof response.body.summary.totalCost).toBe('number');
    });
  });

  describe('Maintenance Workflow', () => {
    it('should complete full maintenance workflow', async () => {
      // 1. Schedule maintenance
      const scheduleData = {
        type: 'preventivo',
        description: 'Workflow complete test',
        scheduledDate: new Date(
          Date.now() + 1 * 24 * 60 * 60 * 1000,
        ).toISOString(),
        estimatedCost: 300,
        priority: 'media',
        serviceProvider: 'Taller Workflow Test',
        maintenanceItems: [
          {
            item: 'Service completo',
            description: 'Servicio completo del vehículo',
            estimatedCost: 300,
          },
        ],
      };

      const scheduleResponse = await request(app.getHttpServer())
        .post(`/maintenance/vehicles/${testVehicleId}/maintenance`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send(scheduleData)
        .expect(201);

      const workflowMaintenanceId = scheduleResponse.body._id;
      expect(scheduleResponse.body.status).toBe('programado');

      // 2. Start maintenance
      const startResponse = await request(app.getHttpServer())
        .patch(`/maintenance/${workflowMaintenanceId}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          status: 'en_progreso',
          actualStartDate: new Date().toISOString(),
          notes: 'Mantenimiento iniciado según cronograma',
        })
        .expect(200);

      expect(startResponse.body.status).toBe('en_progreso');

      // 3. Complete maintenance
      const completeResponse = await request(app.getHttpServer())
        .patch(`/maintenance/${workflowMaintenanceId}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          status: 'completado',
          actualEndDate: new Date().toISOString(),
          actualCost: 320,
          notes: 'Mantenimiento completado exitosamente',
          completedItems: [
            {
              item: 'Service completo',
              actualCost: 320,
              completed: true,
              notes: 'Servicio realizado sin inconvenientes',
            },
          ],
        })
        .expect(200);

      expect(completeResponse.body.status).toBe('completado');
      expect(completeResponse.body.actualCost).toBe(320);

      // 4. Verify completion in history
      const historyResponse = await request(app.getHttpServer())
        .get(`/maintenance/vehicles/${testVehicleId}/maintenance`)
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      const completedMaintenance = historyResponse.body.maintenanceHistory.find(
        (m) => m._id === workflowMaintenanceId,
      );
      expect(completedMaintenance.status).toBe('completado');
    });
  });
});
