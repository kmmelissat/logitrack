import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import * as request from 'supertest';
import { AppModule } from '../../src/app.module';

describe('Auth (e2e)', () => {
  let app: INestApplication;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    await app.init();
  });

  afterAll(async () => {
    await app.close();
  });

  describe('POST /auth/login', () => {
    it('should login successfully with admin credentials', async () => {
      const response = await request(app.getHttpServer())
        .post('/auth/login')
        .send({
          email: 'admin@logitrack.com',
          password: 'admin123',
        })
        .expect(200);

      expect(response.body).toHaveProperty('token');
      expect(response.body).toHaveProperty('user');
      expect(response.body.user.role).toBe('admin');
      expect(response.body.user.email).toBe('admin@logitrack.com');
      expect(response.body.user).not.toHaveProperty('password');
    });

    it('should login successfully with logistics credentials', async () => {
      const response = await request(app.getHttpServer())
        .post('/auth/login')
        .send({
          email: 'logistica@logitrack.com',
          password: 'logistica123',
        })
        .expect(200);

      expect(response.body).toHaveProperty('token');
      expect(response.body).toHaveProperty('user');
      expect(response.body.user.role).toBe('logistica');
      expect(response.body.user.email).toBe('logistica@logitrack.com');
    });

    it('should login successfully with driver credentials', async () => {
      const response = await request(app.getHttpServer())
        .post('/auth/login')
        .send({
          email: 'conductor1@logitrack.com',
          password: 'conductor123',
        })
        .expect(200);

      expect(response.body).toHaveProperty('token');
      expect(response.body).toHaveProperty('user');
      expect(response.body.user.role).toBe('conductor');
      expect(response.body.user.email).toBe('conductor1@logitrack.com');
    });

    it('should fail with invalid email', async () => {
      await request(app.getHttpServer())
        .post('/auth/login')
        .send({
          email: 'nonexistent@logitrack.com',
          password: 'admin123',
        })
        .expect(401);
    });

    it('should fail with invalid password', async () => {
      await request(app.getHttpServer())
        .post('/auth/login')
        .send({
          email: 'admin@logitrack.com',
          password: 'wrongpassword',
        })
        .expect(401);
    });

    it('should fail with missing credentials', async () => {
      await request(app.getHttpServer())
        .post('/auth/login')
        .send({})
        .expect(400);
    });

    it('should fail with malformed email', async () => {
      await request(app.getHttpServer())
        .post('/auth/login')
        .send({
          email: 'invalid-email',
          password: 'admin123',
        })
        .expect(400);
    });
  });

  describe('POST /auth/register', () => {
    const testUser = {
      email: 'test@logitrack.com',
      password: 'test123',
      firstName: 'Test',
      lastName: 'User',
      role: 'conductor',
    };

    it('should register a new user successfully', async () => {
      const response = await request(app.getHttpServer())
        .post('/auth/register')
        .send(testUser)
        .expect(201);

      expect(response.body).toHaveProperty('token');
      expect(response.body).toHaveProperty('user');
      expect(response.body.user.email).toBe(testUser.email);
      expect(response.body.user.firstName).toBe(testUser.firstName);
      expect(response.body.user.lastName).toBe(testUser.lastName);
      expect(response.body.user.role).toBe(testUser.role);
      expect(response.body.user).not.toHaveProperty('password');
    });

    it('should fail to register duplicate email', async () => {
      // Try to register the same user again
      await request(app.getHttpServer())
        .post('/auth/register')
        .send(testUser)
        .expect(409);
    });

    it('should fail with invalid email format', async () => {
      await request(app.getHttpServer())
        .post('/auth/register')
        .send({
          ...testUser,
          email: 'invalid-email',
        })
        .expect(400);
    });

    it('should fail with missing required fields', async () => {
      await request(app.getHttpServer())
        .post('/auth/register')
        .send({
          email: 'another@test.com',
          password: 'test123',
          // Missing firstName, lastName, role
        })
        .expect(400);
    });

    it('should fail with invalid role', async () => {
      await request(app.getHttpServer())
        .post('/auth/register')
        .send({
          ...testUser,
          email: 'another@test.com',
          role: 'invalid-role',
        })
        .expect(400);
    });

    it('should fail with weak password', async () => {
      await request(app.getHttpServer())
        .post('/auth/register')
        .send({
          ...testUser,
          email: 'weak@test.com',
          password: '123', // Too short
        })
        .expect(400);
    });
  });

  describe('Authentication Flow', () => {
    let authToken: string;
    let userId: string;

    it('should complete full authentication flow', async () => {
      // Step 1: Register new user
      const registerResponse = await request(app.getHttpServer())
        .post('/auth/register')
        .send({
          email: 'flow@test.com',
          password: 'flow123',
          firstName: 'Flow',
          lastName: 'Test',
          role: 'conductor',
        })
        .expect(201);

      authToken = registerResponse.body.token;
      userId = registerResponse.body.user._id;

      expect(authToken).toBeDefined();
      expect(userId).toBeDefined();

      // Step 2: Use token to access protected endpoint
      const protectedResponse = await request(app.getHttpServer())
        .get('/users')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(Array.isArray(protectedResponse.body)).toBe(true);

      // Step 3: Login with the same credentials
      const loginResponse = await request(app.getHttpServer())
        .post('/auth/login')
        .send({
          email: 'flow@test.com',
          password: 'flow123',
        })
        .expect(200);

      expect(loginResponse.body).toHaveProperty('token');
      expect(loginResponse.body.user._id).toBe(userId);
    });
  });

  describe('Protected Routes', () => {
    let adminToken: string;
    let logisticsToken: string;
    let driverToken: string;

    beforeAll(async () => {
      // Get admin token
      const adminResponse = await request(app.getHttpServer())
        .post('/auth/login')
        .send({
          email: 'admin@logitrack.com',
          password: 'admin123',
        });
      adminToken = adminResponse.body.token;

      // Get logistics token
      const logisticsResponse = await request(app.getHttpServer())
        .post('/auth/login')
        .send({
          email: 'logistica@logitrack.com',
          password: 'logistica123',
        });
      logisticsToken = logisticsResponse.body.token;

      // Get driver token
      const driverResponse = await request(app.getHttpServer())
        .post('/auth/login')
        .send({
          email: 'conductor1@logitrack.com',
          password: 'conductor123',
        });
      driverToken = driverResponse.body.token;
    });

    it('should allow admin to access users endpoint', async () => {
      await request(app.getHttpServer())
        .get('/users')
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);
    });

    it('should allow logistics to access vehicles endpoint', async () => {
      await request(app.getHttpServer())
        .get('/vehicles')
        .set('Authorization', `Bearer ${logisticsToken}`)
        .expect(200);
    });

    it('should allow driver to access vehicles endpoint', async () => {
      await request(app.getHttpServer())
        .get('/vehicles')
        .set('Authorization', `Bearer ${driverToken}`)
        .expect(200);
    });

    it('should reject requests without token', async () => {
      await request(app.getHttpServer()).get('/users').expect(401);
    });

    it('should reject requests with invalid token', async () => {
      await request(app.getHttpServer())
        .get('/users')
        .set('Authorization', 'Bearer invalid-token')
        .expect(401);
    });

    it('should reject expired or malformed tokens', async () => {
      await request(app.getHttpServer())
        .get('/users')
        .set(
          'Authorization',
          'Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.invalid',
        )
        .expect(401);
    });
  });
});

