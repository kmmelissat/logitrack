import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import * as request from 'supertest';
import { AppModule } from '../src/app.module';

describe('MaintenanceController (e2e)', () => {
  let app: INestApplication;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    await app.init();
  });

  it('/maintenance (POST) crea un mantenimiento', async () => {
    const response = await request(app.getHttpServer())
      .post('/maintenance')
      .send({ /* datos de mantenimiento */ });
    expect(response.status).toBe(201);
    // expect(response.body).toHaveProperty('id');
  });

  it('/maintenance/:id (GET) obtiene un mantenimiento', async () => {
    const id = 1; // Usa un ID válido según tu base de datos/prueba
    const response = await request(app.getHttpServer())
      .get(`/maintenance/${id}`);
    expect(response.status).toBe(200);
    // expect(response.body).toHaveProperty('id', id);
  });

  afterAll(async () => {
    await app.close();
  });
});