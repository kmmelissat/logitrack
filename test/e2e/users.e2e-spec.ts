import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import * as request from 'supertest';
import { AppModule } from '../../src/app.module';

describe('Users (e2e)', () => {
  let app: INestApplication;
  let adminToken: string;
  let logisticsToken: string;
  let driverToken: string;
  let testUserId: string;
  let adminUserId: string;

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
    adminUserId = adminResponse.body.user._id;

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
  });

  afterAll(async () => {
    await app.close();
  });

  describe('POST /users', () => {
    const testUser = {
      email: 'testuser@logitrack.com',
      password: 'testpass123',
      firstName: 'Test',
      lastName: 'User',
      role: 'conductor',
      phone: '+503 7777-8888',
      address: 'Test Address, San Salvador',
      isActive: true,
    };

    it('should create user as admin', async () => {
      const response = await request(app.getHttpServer())
        .post('/users')
        .set('Authorization', `Bearer ${adminToken}`)
        .send(testUser)
        .expect(201);

      expect(response.body).toHaveProperty('_id');
      expect(response.body.email).toBe(testUser.email);
      expect(response.body.firstName).toBe(testUser.firstName);
      expect(response.body.lastName).toBe(testUser.lastName);
      expect(response.body.role).toBe(testUser.role);
      expect(response.body).not.toHaveProperty('password'); // Password should not be returned

      testUserId = response.body._id;
    });

    it('should create user with different roles', async () => {
      const roles = ['conductor', 'logistica'];

      for (let i = 0; i < roles.length; i++) {
        const role = roles[i];
        const userData = {
          ...testUser,
          email: `${role}test${i}@logitrack.com`,
          role: role,
          firstName: role.charAt(0).toUpperCase() + role.slice(1),
          lastName: 'TestUser',
        };

        const response = await request(app.getHttpServer())
          .post('/users')
          .set('Authorization', `Bearer ${adminToken}`)
          .send(userData)
          .expect(201);

        expect(response.body.role).toBe(role);
      }
    });

    it('should reject user creation by non-admin', async () => {
      await request(app.getHttpServer())
        .post('/users')
        .set('Authorization', `Bearer ${logisticsToken}`)
        .send({
          ...testUser,
          email: 'logistics-attempt@logitrack.com',
        })
        .expect(403);

      await request(app.getHttpServer())
        .post('/users')
        .set('Authorization', `Bearer ${driverToken}`)
        .send({
          ...testUser,
          email: 'driver-attempt@logitrack.com',
        })
        .expect(403);
    });

    it('should fail with duplicate email', async () => {
      await request(app.getHttpServer())
        .post('/users')
        .set('Authorization', `Bearer ${adminToken}`)
        .send(testUser)
        .expect(409);
    });

    it('should fail with invalid email format', async () => {
      await request(app.getHttpServer())
        .post('/users')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          ...testUser,
          email: 'invalid-email',
        })
        .expect(400);
    });

    it('should fail with invalid role', async () => {
      await request(app.getHttpServer())
        .post('/users')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          ...testUser,
          email: 'invalid-role@logitrack.com',
          role: 'invalid-role',
        })
        .expect(400);
    });

    it('should fail with missing required fields', async () => {
      await request(app.getHttpServer())
        .post('/users')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          email: 'incomplete@logitrack.com',
          // Missing firstName, lastName, role, password
        })
        .expect(400);
    });

    it('should fail with weak password', async () => {
      await request(app.getHttpServer())
        .post('/users')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          ...testUser,
          email: 'weak-password@logitrack.com',
          password: '123', // Too weak
        })
        .expect(400);
    });
  });

  describe('GET /users', () => {
    it('should get all users as admin', async () => {
      const response = await request(app.getHttpServer())
        .get('/users')
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      expect(Array.isArray(response.body)).toBe(true);
      expect(response.body.length).toBeGreaterThan(0);

      // Check user structure
      response.body.forEach((user) => {
        expect(user).toHaveProperty('_id');
        expect(user).toHaveProperty('email');
        expect(user).toHaveProperty('firstName');
        expect(user).toHaveProperty('lastName');
        expect(user).toHaveProperty('role');
        expect(user).not.toHaveProperty('password');
      });
    });

    it('should get users with role filter', async () => {
      const response = await request(app.getHttpServer())
        .get('/users?role=conductor')
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      response.body.forEach((user) => {
        expect(user.role).toBe('conductor');
      });
    });

    it('should get only active users', async () => {
      const response = await request(app.getHttpServer())
        .get('/users?isActive=true')
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      response.body.forEach((user) => {
        expect(user.isActive).toBe(true);
      });
    });

    it('should reject unauthorized access', async () => {
      await request(app.getHttpServer()).get('/users').expect(401);
    });

    it('should reject access by non-admin/logistics', async () => {
      await request(app.getHttpServer())
        .get('/users')
        .set('Authorization', `Bearer ${driverToken}`)
        .expect(403);
    });

    it('should allow logistics to view users', async () => {
      await request(app.getHttpServer())
        .get('/users')
        .set('Authorization', `Bearer ${logisticsToken}`)
        .expect(200);
    });
  });

  describe('GET /users/:id', () => {
    it('should get user by ID as admin', async () => {
      const response = await request(app.getHttpServer())
        .get(`/users/${testUserId}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      expect(response.body._id).toBe(testUserId);
      expect(response.body).toHaveProperty('email');
      expect(response.body).toHaveProperty('firstName');
      expect(response.body).not.toHaveProperty('password');
    });

    it('should allow logistics to view specific user', async () => {
      await request(app.getHttpServer())
        .get(`/users/${testUserId}`)
        .set('Authorization', `Bearer ${logisticsToken}`)
        .expect(200);
    });

    it('should allow driver to view own profile', async () => {
      // Get driver's own ID from token response
      const driverResponse = await request(app.getHttpServer())
        .post('/auth/login')
        .send({
          email: 'conductor1@logitrack.com',
          password: 'conductor123',
        });

      const driverId = driverResponse.body.user._id;

      await request(app.getHttpServer())
        .get(`/users/${driverId}`)
        .set('Authorization', `Bearer ${driverToken}`)
        .expect(200);
    });

    it('should return 404 for non-existent user', async () => {
      await request(app.getHttpServer())
        .get('/users/507f1f77bcf86cd799439011')
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(404);
    });

    it('should reject access to other users by driver', async () => {
      await request(app.getHttpServer())
        .get(`/users/${testUserId}`)
        .set('Authorization', `Bearer ${driverToken}`)
        .expect(403);
    });
  });

  describe('PATCH /users/:id', () => {
    it('should update user as admin', async () => {
      const updateData = {
        firstName: 'UpdatedTest',
        lastName: 'UpdatedUser',
        phone: '+503 9999-0000',
        address: 'Updated Address, San Salvador',
      };

      const response = await request(app.getHttpServer())
        .patch(`/users/${testUserId}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send(updateData)
        .expect(200);

      expect(response.body.firstName).toBe(updateData.firstName);
      expect(response.body.lastName).toBe(updateData.lastName);
      expect(response.body.phone).toBe(updateData.phone);
      expect(response.body.address).toBe(updateData.address);
    });

    it('should update user role as admin', async () => {
      const updateData = {
        role: 'logistica',
      };

      const response = await request(app.getHttpServer())
        .patch(`/users/${testUserId}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send(updateData)
        .expect(200);

      expect(response.body.role).toBe('logistica');
    });

    it('should update password as admin', async () => {
      const updateData = {
        password: 'newpassword123',
      };

      await request(app.getHttpServer())
        .patch(`/users/${testUserId}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send(updateData)
        .expect(200);

      // Verify new password works by attempting login
      const loginResponse = await request(app.getHttpServer())
        .post('/auth/login')
        .send({
          email: 'testuser@logitrack.com',
          password: 'newpassword123',
        })
        .expect(200);

      expect(loginResponse.body).toHaveProperty('token');
    });

    it('should allow logistics to update users', async () => {
      const updateData = {
        phone: '+503 8888-9999',
      };

      await request(app.getHttpServer())
        .patch(`/users/${testUserId}`)
        .set('Authorization', `Bearer ${logisticsToken}`)
        .send(updateData)
        .expect(200);
    });

    it('should allow driver to update own profile', async () => {
      // Get driver's own ID
      const driverResponse = await request(app.getHttpServer())
        .post('/auth/login')
        .send({
          email: 'conductor1@logitrack.com',
          password: 'conductor123',
        });

      const driverId = driverResponse.body.user._id;

      const updateData = {
        phone: '+503 7777-1111',
        address: 'Driver Updated Address',
      };

      await request(app.getHttpServer())
        .patch(`/users/${driverId}`)
        .set('Authorization', `Bearer ${driverToken}`)
        .send(updateData)
        .expect(200);
    });

    it('should reject role changes by non-admin', async () => {
      await request(app.getHttpServer())
        .patch(`/users/${testUserId}`)
        .set('Authorization', `Bearer ${logisticsToken}`)
        .send({ role: 'admin' })
        .expect(403);
    });

    it('should reject driver updating other users', async () => {
      await request(app.getHttpServer())
        .patch(`/users/${testUserId}`)
        .set('Authorization', `Bearer ${driverToken}`)
        .send({ firstName: 'Unauthorized' })
        .expect(403);
    });

    it('should fail with invalid email format', async () => {
      await request(app.getHttpServer())
        .patch(`/users/${testUserId}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ email: 'invalid-email' })
        .expect(400);
    });

    it('should fail with duplicate email', async () => {
      await request(app.getHttpServer())
        .patch(`/users/${testUserId}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ email: 'admin@logitrack.com' })
        .expect(409);
    });
  });

  describe('PATCH /users/:id/deactivate', () => {
    it('should deactivate user as admin', async () => {
      const response = await request(app.getHttpServer())
        .patch(`/users/${testUserId}/deactivate`)
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      expect(response.body.isActive).toBe(false);

      // Verify deactivated user cannot login
      await request(app.getHttpServer())
        .post('/auth/login')
        .send({
          email: 'testuser@logitrack.com',
          password: 'newpassword123',
        })
        .expect(401);
    });

    it('should reject deactivation by non-admin', async () => {
      await request(app.getHttpServer())
        .patch(`/users/${testUserId}/deactivate`)
        .set('Authorization', `Bearer ${logisticsToken}`)
        .expect(403);
    });

    it('should prevent admin from deactivating themselves', async () => {
      await request(app.getHttpServer())
        .patch(`/users/${adminUserId}/deactivate`)
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(400);
    });
  });

  describe('PATCH /users/:id/activate', () => {
    it('should activate user as admin', async () => {
      const response = await request(app.getHttpServer())
        .patch(`/users/${testUserId}/activate`)
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      expect(response.body.isActive).toBe(true);

      // Verify activated user can login
      await request(app.getHttpServer())
        .post('/auth/login')
        .send({
          email: 'testuser@logitrack.com',
          password: 'newpassword123',
        })
        .expect(200);
    });

    it('should reject activation by non-admin', async () => {
      await request(app.getHttpServer())
        .patch(`/users/${testUserId}/activate`)
        .set('Authorization', `Bearer ${logisticsToken}`)
        .expect(403);
    });
  });

  describe('DELETE /users/:id', () => {
    let userToDeleteId: string;

    beforeEach(async () => {
      // Create a user to delete for each test
      const response = await request(app.getHttpServer())
        .post('/users')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          email: 'todelete@logitrack.com',
          password: 'delete123',
          firstName: 'To',
          lastName: 'Delete',
          role: 'conductor',
        });
      userToDeleteId = response.body._id;
    });

    it('should delete user as admin', async () => {
      await request(app.getHttpServer())
        .delete(`/users/${userToDeleteId}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      // Verify user is deleted
      await request(app.getHttpServer())
        .get(`/users/${userToDeleteId}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(404);
    });

    it('should reject deletion by non-admin', async () => {
      await request(app.getHttpServer())
        .delete(`/users/${userToDeleteId}`)
        .set('Authorization', `Bearer ${logisticsToken}`)
        .expect(403);

      await request(app.getHttpServer())
        .delete(`/users/${userToDeleteId}`)
        .set('Authorization', `Bearer ${driverToken}`)
        .expect(403);
    });

    it('should prevent admin from deleting themselves', async () => {
      await request(app.getHttpServer())
        .delete(`/users/${adminUserId}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(400);
    });

    it('should return 404 for non-existent user', async () => {
      await request(app.getHttpServer())
        .delete('/users/507f1f77bcf86cd799439011')
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(404);
    });
  });

  describe('GET /users/profile', () => {
    it('should get current user profile', async () => {
      const response = await request(app.getHttpServer())
        .get('/users/profile')
        .set('Authorization', `Bearer ${driverToken}`)
        .expect(200);

      expect(response.body).toHaveProperty('_id');
      expect(response.body).toHaveProperty('email');
      expect(response.body.role).toBe('conductor');
      expect(response.body).not.toHaveProperty('password');
    });

    it('should reject unauthenticated requests', async () => {
      await request(app.getHttpServer()).get('/users/profile').expect(401);
    });
  });

  describe('PATCH /users/profile', () => {
    it('should update own profile', async () => {
      const updateData = {
        firstName: 'UpdatedDriver',
        phone: '+503 6666-7777',
        address: 'New Driver Address',
      };

      const response = await request(app.getHttpServer())
        .patch('/users/profile')
        .set('Authorization', `Bearer ${driverToken}`)
        .send(updateData)
        .expect(200);

      expect(response.body.firstName).toBe(updateData.firstName);
      expect(response.body.phone).toBe(updateData.phone);
    });

    it('should not allow role change in profile update', async () => {
      await request(app.getHttpServer())
        .patch('/users/profile')
        .set('Authorization', `Bearer ${driverToken}`)
        .send({ role: 'admin' })
        .expect(400);
    });

    it('should update password in profile', async () => {
      await request(app.getHttpServer())
        .patch('/users/profile')
        .set('Authorization', `Bearer ${driverToken}`)
        .send({ password: 'newdriverpass123' })
        .expect(200);

      // Verify new password works
      await request(app.getHttpServer())
        .post('/auth/login')
        .send({
          email: 'conductor1@logitrack.com',
          password: 'newdriverpass123',
        })
        .expect(200);
    });
  });

  describe('User Management Scenarios', () => {
    it('should handle complete user lifecycle', async () => {
      // 1. Create user
      const newUser = {
        email: 'lifecycle@logitrack.com',
        password: 'lifecycle123',
        firstName: 'Life',
        lastName: 'Cycle',
        role: 'conductor',
      };

      const createResponse = await request(app.getHttpServer())
        .post('/users')
        .set('Authorization', `Bearer ${adminToken}`)
        .send(newUser)
        .expect(201);

      const userId = createResponse.body._id;

      // 2. User should be able to login
      await request(app.getHttpServer())
        .post('/auth/login')
        .send({
          email: newUser.email,
          password: newUser.password,
        })
        .expect(200);

      // 3. Update user details
      await request(app.getHttpServer())
        .patch(`/users/${userId}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          firstName: 'UpdatedLife',
          role: 'logistica',
        })
        .expect(200);

      // 4. Deactivate user
      await request(app.getHttpServer())
        .patch(`/users/${userId}/deactivate`)
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      // 5. User should not be able to login
      await request(app.getHttpServer())
        .post('/auth/login')
        .send({
          email: newUser.email,
          password: newUser.password,
        })
        .expect(401);

      // 6. Reactivate user
      await request(app.getHttpServer())
        .patch(`/users/${userId}/activate`)
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      // 7. User should be able to login again
      await request(app.getHttpServer())
        .post('/auth/login')
        .send({
          email: newUser.email,
          password: newUser.password,
        })
        .expect(200);

      // 8. Delete user
      await request(app.getHttpServer())
        .delete(`/users/${userId}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      // 9. User should not exist
      await request(app.getHttpServer())
        .get(`/users/${userId}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(404);
    });

    it('should manage users by role effectively', async () => {
      // Get users by role
      const driversResponse = await request(app.getHttpServer())
        .get('/users?role=conductor')
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      const logisticsResponse = await request(app.getHttpServer())
        .get('/users?role=logistica')
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      const adminsResponse = await request(app.getHttpServer())
        .get('/users?role=admin')
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      // Verify role filtering works
      driversResponse.body.forEach((user) =>
        expect(user.role).toBe('conductor'),
      );
      logisticsResponse.body.forEach((user) =>
        expect(user.role).toBe('logistica'),
      );
      adminsResponse.body.forEach((user) => expect(user.role).toBe('admin'));

      // Should have at least one of each role
      expect(driversResponse.body.length).toBeGreaterThan(0);
      expect(logisticsResponse.body.length).toBeGreaterThan(0);
      expect(adminsResponse.body.length).toBeGreaterThan(0);
    });

    it('should enforce security constraints consistently', async () => {
      // Non-authenticated requests should always fail
      const endpoints = ['/users', `/users/${testUserId}`, '/users/profile'];

      for (const endpoint of endpoints) {
        await request(app.getHttpServer()).get(endpoint).expect(401);
      }

      // Drivers should only access their own data
      const driverResponse = await request(app.getHttpServer())
        .post('/auth/login')
        .send({
          email: 'conductor1@logitrack.com',
          password: 'newdriverpass123',
        });

      const driverId = driverResponse.body.user._id;
      const driverAuthToken = driverResponse.body.token;

      // Should access own profile
      await request(app.getHttpServer())
        .get(`/users/${driverId}`)
        .set('Authorization', `Bearer ${driverAuthToken}`)
        .expect(200);

      // Should not access other users
      await request(app.getHttpServer())
        .get(`/users/${testUserId}`)
        .set('Authorization', `Bearer ${driverAuthToken}`)
        .expect(403);

      // Should not list all users
      await request(app.getHttpServer())
        .get('/users')
        .set('Authorization', `Bearer ${driverAuthToken}`)
        .expect(403);
    });
  });
});

