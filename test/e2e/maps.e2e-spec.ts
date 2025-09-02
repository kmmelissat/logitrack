import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import * as request from 'supertest';
import { AppModule } from '../../src/app.module';

describe('Maps (e2e)', () => {
  let app: INestApplication;
  let adminToken: string;
  let logisticsToken: string;
  let driverToken: string;

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
  });

  afterAll(async () => {
    await app.close();
  });

  describe('GET /maps/distance', () => {
    const validOrigin = 'San Salvador, El Salvador';
    const validDestination = 'Santa Ana, El Salvador';

    it('should calculate distance between two addresses as admin', async () => {
      const response = await request(app.getHttpServer())
        .get('/maps/distance')
        .query({
          origin: validOrigin,
          destination: validDestination,
        })
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      expect(response.body).toHaveProperty('distance');
      expect(response.body).toHaveProperty('duration');
      expect(response.body.distance).toHaveProperty('text');
      expect(response.body.distance).toHaveProperty('value');
      expect(response.body.duration).toHaveProperty('text');
      expect(response.body.duration).toHaveProperty('value');
      expect(typeof response.body.distance.value).toBe('number');
      expect(typeof response.body.duration.value).toBe('number');
    });

    it('should calculate distance as logistics', async () => {
      await request(app.getHttpServer())
        .get('/maps/distance')
        .query({
          origin: validOrigin,
          destination: validDestination,
        })
        .set('Authorization', `Bearer ${logisticsToken}`)
        .expect(200);
    });

    it('should calculate distance with coordinates', async () => {
      const coordinateOrigin = '13.6929,-89.2182'; // San Salvador coordinates
      const coordinateDestination = '13.9944,-89.5556'; // Santa Ana coordinates

      const response = await request(app.getHttpServer())
        .get('/maps/distance')
        .query({
          origin: coordinateOrigin,
          destination: coordinateDestination,
        })
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      expect(response.body).toHaveProperty('distance');
      expect(response.body).toHaveProperty('duration');
    });

    it('should reject distance calculation by driver', async () => {
      await request(app.getHttpServer())
        .get('/maps/distance')
        .query({
          origin: validOrigin,
          destination: validDestination,
        })
        .set('Authorization', `Bearer ${driverToken}`)
        .expect(403);
    });

    it('should fail with missing origin', async () => {
      await request(app.getHttpServer())
        .get('/maps/distance')
        .query({
          destination: validDestination,
        })
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(400);
    });

    it('should fail with missing destination', async () => {
      await request(app.getHttpServer())
        .get('/maps/distance')
        .query({
          origin: validOrigin,
        })
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(400);
    });

    it('should handle invalid addresses gracefully', async () => {
      const response = await request(app.getHttpServer())
        .get('/maps/distance')
        .query({
          origin: 'Invalid Address 12345',
          destination: 'Another Invalid Address 67890',
        })
        .set('Authorization', `Bearer ${adminToken}`);

      // Should either return 400 or handle the error gracefully
      expect([400, 404].includes(response.status)).toBe(true);
    });
  });

  describe('GET /maps/directions', () => {
    const validOrigin = 'San Salvador, El Salvador';
    const validDestination = 'Santa Ana, El Salvador';
    const waypoints = 'Antiguo Cuscatlán, El Salvador|Comalapa, El Salvador';

    it('should get directions between two points', async () => {
      const response = await request(app.getHttpServer())
        .get('/maps/directions')
        .query({
          origin: validOrigin,
          destination: validDestination,
        })
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      expect(response.body).toHaveProperty('routes');
      expect(Array.isArray(response.body.routes)).toBe(true);
      expect(response.body.routes.length).toBeGreaterThan(0);

      const route = response.body.routes[0];
      expect(route).toHaveProperty('legs');
      expect(route).toHaveProperty('overview_polyline');
      expect(Array.isArray(route.legs)).toBe(true);
    });

    it('should get directions with waypoints', async () => {
      const response = await request(app.getHttpServer())
        .get('/maps/directions')
        .query({
          origin: validOrigin,
          destination: validDestination,
          waypoints: waypoints,
        })
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      expect(response.body).toHaveProperty('routes');
      const route = response.body.routes[0];
      expect(route.legs.length).toBeGreaterThan(1); // Should have multiple legs due to waypoints
    });

    it('should allow logistics to get directions', async () => {
      await request(app.getHttpServer())
        .get('/maps/directions')
        .query({
          origin: validOrigin,
          destination: validDestination,
        })
        .set('Authorization', `Bearer ${logisticsToken}`)
        .expect(200);
    });

    it('should allow driver to get directions', async () => {
      await request(app.getHttpServer())
        .get('/maps/directions')
        .query({
          origin: validOrigin,
          destination: validDestination,
        })
        .set('Authorization', `Bearer ${driverToken}`)
        .expect(200);
    });

    it('should work with coordinate inputs', async () => {
      const response = await request(app.getHttpServer())
        .get('/maps/directions')
        .query({
          origin: '13.6929,-89.2182',
          destination: '13.9944,-89.5556',
        })
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      expect(response.body).toHaveProperty('routes');
    });
  });

  describe('GET /maps/geocode', () => {
    const validAddress = 'Catedral Metropolitana, San Salvador, El Salvador';

    it('should geocode an address as admin', async () => {
      const response = await request(app.getHttpServer())
        .get('/maps/geocode')
        .query({
          address: validAddress,
        })
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      expect(response.body).toHaveProperty('results');
      expect(Array.isArray(response.body.results)).toBe(true);

      if (response.body.results.length > 0) {
        const result = response.body.results[0];
        expect(result).toHaveProperty('geometry');
        expect(result.geometry).toHaveProperty('location');
        expect(result.geometry.location).toHaveProperty('lat');
        expect(result.geometry.location).toHaveProperty('lng');
        expect(typeof result.geometry.location.lat).toBe('number');
        expect(typeof result.geometry.location.lng).toBe('number');
      }
    });

    it('should geocode as logistics', async () => {
      await request(app.getHttpServer())
        .get('/maps/geocode')
        .query({
          address: validAddress,
        })
        .set('Authorization', `Bearer ${logisticsToken}`)
        .expect(200);
    });

    it('should reject geocoding by driver', async () => {
      await request(app.getHttpServer())
        .get('/maps/geocode')
        .query({
          address: validAddress,
        })
        .set('Authorization', `Bearer ${driverToken}`)
        .expect(403);
    });

    it('should fail with missing address', async () => {
      await request(app.getHttpServer())
        .get('/maps/geocode')
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(400);
    });

    it('should geocode various address formats', async () => {
      const addresses = [
        'Terminal de Oriente, San Salvador',
        'Plaza Libertad, San Salvador, El Salvador',
        'Universidad de El Salvador',
      ];

      for (const address of addresses) {
        const response = await request(app.getHttpServer())
          .get('/maps/geocode')
          .query({ address })
          .set('Authorization', `Bearer ${adminToken}`);

        expect([200, 400].includes(response.status)).toBe(true);
      }
    });
  });

  describe('GET /maps/route/complete', () => {
    const validOrigin = 'San Salvador, El Salvador';
    const validDestination = 'Santa Ana, El Salvador';

    it('should get complete route with polyline and steps', async () => {
      const response = await request(app.getHttpServer())
        .get('/maps/route/complete')
        .query({
          origin: validOrigin,
          destination: validDestination,
        })
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      expect(response.body).toHaveProperty('routePolyline');
      expect(response.body).toHaveProperty('decodedPath');
      expect(response.body).toHaveProperty('estimatedDistance');
      expect(response.body).toHaveProperty('estimatedDistanceText');
      expect(response.body).toHaveProperty('estimatedDuration');
      expect(response.body).toHaveProperty('estimatedDurationText');
      expect(response.body).toHaveProperty('routeSteps');

      expect(typeof response.body.routePolyline).toBe('string');
      expect(Array.isArray(response.body.decodedPath)).toBe(true);
      expect(Array.isArray(response.body.routeSteps)).toBe(true);
      expect(typeof response.body.estimatedDistance).toBe('number');
      expect(typeof response.body.estimatedDuration).toBe('number');

      // Check decoded path structure
      if (response.body.decodedPath.length > 0) {
        const point = response.body.decodedPath[0];
        expect(point).toHaveProperty('lat');
        expect(point).toHaveProperty('lng');
        expect(typeof point.lat).toBe('number');
        expect(typeof point.lng).toBe('number');
      }

      // Check route steps structure
      if (response.body.routeSteps.length > 0) {
        const step = response.body.routeSteps[0];
        expect(step).toHaveProperty('instruction');
        expect(step).toHaveProperty('distance');
        expect(step).toHaveProperty('duration');
        expect(step).toHaveProperty('startLocation');
        expect(step).toHaveProperty('endLocation');
      }
    });

    it('should get complete route with waypoints', async () => {
      const response = await request(app.getHttpServer())
        .get('/maps/route/complete')
        .query({
          origin: validOrigin,
          destination: validDestination,
          waypoints: 'Antiguo Cuscatlán, El Salvador',
        })
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      expect(response.body).toHaveProperty('waypoints');
      expect(Array.isArray(response.body.waypoints)).toBe(true);
    });

    it('should allow logistics to get complete route', async () => {
      await request(app.getHttpServer())
        .get('/maps/route/complete')
        .query({
          origin: validOrigin,
          destination: validDestination,
        })
        .set('Authorization', `Bearer ${logisticsToken}`)
        .expect(200);
    });

    it('should allow driver to get complete route', async () => {
      await request(app.getHttpServer())
        .get('/maps/route/complete')
        .query({
          origin: validOrigin,
          destination: validDestination,
        })
        .set('Authorization', `Bearer ${driverToken}`)
        .expect(200);
    });

    it('should work with coordinate inputs', async () => {
      const response = await request(app.getHttpServer())
        .get('/maps/route/complete')
        .query({
          origin: '13.6929,-89.2182',
          destination: '13.9944,-89.5556',
        })
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      expect(response.body).toHaveProperty('routePolyline');
      expect(response.body).toHaveProperty('decodedPath');
    });

    it('should handle multiple waypoints correctly', async () => {
      const response = await request(app.getHttpServer())
        .get('/maps/route/complete')
        .query({
          origin: validOrigin,
          destination: validDestination,
          waypoints: 'Antiguo Cuscatlán, El Salvador|La Libertad, El Salvador',
        })
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      expect(response.body).toHaveProperty('waypoints');
      expect(response.body.waypoints.length).toBeGreaterThanOrEqual(2);
    });
  });

  describe('Maps Integration Scenarios', () => {
    it('should calculate route for typical delivery scenario', async () => {
      const deliveryOrigin = 'Terminal de Oriente, San Salvador';
      const deliveryDestination = 'Terminal de Occidente, Santa Ana';
      const checkpoints = 'Soyapango, El Salvador|Apopa, El Salvador';

      // Get complete route information
      const routeResponse = await request(app.getHttpServer())
        .get('/maps/route/complete')
        .query({
          origin: deliveryOrigin,
          destination: deliveryDestination,
          waypoints: checkpoints,
        })
        .set('Authorization', `Bearer ${logisticsToken}`)
        .expect(200);

      // Verify we have all necessary information for route planning
      expect(routeResponse.body.estimatedDistance).toBeGreaterThan(0);
      expect(routeResponse.body.estimatedDuration).toBeGreaterThan(0);
      expect(routeResponse.body.decodedPath.length).toBeGreaterThan(10);
      expect(routeResponse.body.routeSteps.length).toBeGreaterThan(1);

      // Calculate just the distance for cost estimation
      const distanceResponse = await request(app.getHttpServer())
        .get('/maps/distance')
        .query({
          origin: deliveryOrigin,
          destination: deliveryDestination,
        })
        .set('Authorization', `Bearer ${logisticsToken}`)
        .expect(200);

      // Verify distance consistency
      expect(
        Math.abs(
          routeResponse.body.estimatedDistance -
            distanceResponse.body.distance.value,
        ),
      ).toBeLessThan(routeResponse.body.estimatedDistance * 0.1); // Allow 10% difference
    });

    it('should handle El Salvador specific locations', async () => {
      const salvadoranLocations = [
        'Centro Histórico, San Salvador',
        'Plaza Morazán, San Salvador',
        'Metrocentro, San Salvador',
        'Plaza Mundo, Santa Ana',
        'Puerto de La Libertad',
      ];

      for (let i = 0; i < salvadoranLocations.length - 1; i++) {
        const origin = salvadoranLocations[i];
        const destination = salvadoranLocations[i + 1];

        const response = await request(app.getHttpServer())
          .get('/maps/distance')
          .query({ origin, destination })
          .set('Authorization', `Bearer ${adminToken}`);

        // Should either succeed or fail gracefully
        expect([200, 400, 404].includes(response.status)).toBe(true);
      }
    });

    it('should geocode common Salvadoran addresses', async () => {
      const addresses = [
        'Catedral Metropolitana, San Salvador',
        'Teatro Nacional, San Salvador',
        'Hospital Nacional Rosales',
        'Universidad Centroamericana José Simeón Cañas',
        'Aeropuerto Internacional Monseñor Óscar Arnulfo Romero',
      ];

      for (const address of addresses) {
        const response = await request(app.getHttpServer())
          .get('/maps/geocode')
          .query({ address })
          .set('Authorization', `Bearer ${logisticsToken}`);

        if (response.status === 200 && response.body.results.length > 0) {
          const location = response.body.results[0].geometry.location;
          // Verify coordinates are roughly in El Salvador bounds
          expect(location.lat).toBeGreaterThan(13.0);
          expect(location.lat).toBeLessThan(15.0);
          expect(location.lng).toBeGreaterThan(-91.0);
          expect(location.lng).toBeLessThan(-87.0);
        }
      }
    });
  });

  describe('Error Handling and Edge Cases', () => {
    it('should handle network timeouts gracefully', async () => {
      // This test assumes the Google Maps API might timeout or be unavailable
      const response = await request(app.getHttpServer())
        .get('/maps/distance')
        .query({
          origin: 'Test Origin',
          destination: 'Test Destination',
        })
        .set('Authorization', `Bearer ${adminToken}`);

      // Should return either success or a proper error response
      expect([200, 400, 404, 500, 503].includes(response.status)).toBe(true);
    });

    it('should validate coordinates format', async () => {
      const invalidCoordinates = [
        'invalid,coordinates',
        '200,300', // Out of range
        'lat,lng', // Non-numeric
      ];

      for (const coords of invalidCoordinates) {
        const response = await request(app.getHttpServer())
          .get('/maps/distance')
          .query({
            origin: coords,
            destination: 'San Salvador, El Salvador',
          })
          .set('Authorization', `Bearer ${adminToken}`);

        expect([400, 404].includes(response.status)).toBe(true);
      }
    });

    it('should handle empty waypoints correctly', async () => {
      const response = await request(app.getHttpServer())
        .get('/maps/directions')
        .query({
          origin: 'San Salvador, El Salvador',
          destination: 'Santa Ana, El Salvador',
          waypoints: '', // Empty waypoints
        })
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      expect(response.body).toHaveProperty('routes');
    });

    it('should reject unauthenticated requests', async () => {
      await request(app.getHttpServer())
        .get('/maps/distance')
        .query({
          origin: 'San Salvador',
          destination: 'Santa Ana',
        })
        .expect(401);
    });

    it('should enforce rate limiting if implemented', async () => {
      // Make multiple rapid requests to test rate limiting
      const requests = Array.from({ length: 10 }, (_, i) =>
        request(app.getHttpServer())
          .get('/maps/geocode')
          .query({ address: `Test Address ${i}` })
          .set('Authorization', `Bearer ${adminToken}`),
      );

      const responses = await Promise.all(requests);

      // All should either succeed or be rate limited
      responses.forEach((response) => {
        expect([200, 400, 404, 429].includes(response.status)).toBe(true);
      });
    });
  });
});

