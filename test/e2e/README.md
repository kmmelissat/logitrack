# E2E Tests for LogiTrack API

This directory contains comprehensive end-to-end tests for the LogiTrack logistics management API. The tests cover all major modules and functionality.

## 📋 Test Coverage

### ✅ Authentication Module (`auth.e2e-spec.ts`)

- User registration and login
- JWT token validation
- Role-based access control
- Password security validation
- Authentication workflow

### 🚚 Vehicle Management (`vehicles.e2e-spec.ts`)

- Vehicle CRUD operations
- Vehicle assignment to drivers
- Vehicle status management (active, workshop, discontinued)
- Driver-specific vehicle updates
- Vehicle filtering and search

### 📍 GPS Events (`gps-events.e2e-spec.ts`)

- GPS event creation and tracking
- Real-time position updates
- Speed violations and emergency events
- Route-based GPS tracking
- Event analytics and statistics

### 🛣️ Route Management (`routes.e2e-spec.ts`)

- Scheduled route creation and management
- Route point management (origin, destination, checkpoints)
- Route status workflow (planned → in progress → completed)
- Vehicle-driver assignment validation
- Route optimization data

### 🔧 Maintenance (`maintenance.e2e-spec.ts`)

- Maintenance record creation (preventive, corrective, emergency)
- Maintenance scheduling and workflow
- Cost tracking and reporting
- Vehicle maintenance history
- Priority-based maintenance management

### 🗺️ Maps Integration (`maps.e2e-spec.ts`)

- Google Maps API integration
- Distance and duration calculation
- Route directions and navigation
- Address geocoding
- Complete route optimization

### ✅ Vehicle Check-ins (`vehicle-checkins.e2e-spec.ts`)

- Driver check-in/check-out workflow
- Vehicle condition reporting
- Route-based check-ins
- Check-in history and analytics
- Multi-driver vehicle management

### 👥 User Management (`users.e2e-spec.ts`)

- User CRUD operations
- Role management (admin, logistics, driver)
- User activation/deactivation
- Profile management
- Security and permission enforcement

## 🚀 Running the Tests

### Prerequisites

1. **Database Setup**: Ensure MongoDB is running and accessible
2. **Environment Variables**: Set up `.env` file with required configurations
3. **Test Data**: Run the database seeders to populate test data
4. **Google Maps API**: Configure Google Maps API key for maps tests

### Setup Commands

```bash
# Install dependencies
npm install

# Setup test database with seed data
npm run seed

# Verify test data
npm run test:data
```

### Individual Test Execution

```bash
# Run all e2e tests
npm run test:e2e

# Run specific test module
npx jest test/e2e/auth.e2e-spec.ts
npx jest test/e2e/vehicles.e2e-spec.ts
npx jest test/e2e/gps-events.e2e-spec.ts
npx jest test/e2e/routes.e2e-spec.ts
npx jest test/e2e/maintenance.e2e-spec.ts
npx jest test/e2e/maps.e2e-spec.ts
npx jest test/e2e/vehicle-checkins.e2e-spec.ts
npx jest test/e2e/users.e2e-spec.ts

# Run with specific options
npx jest test/e2e --verbose
npx jest test/e2e --coverage
npx jest test/e2e --detectOpenHandles
```

### Batch Test Execution

```bash
# Run all tests (unit + integration + e2e)
npm run test:all

# Run only e2e tests
npm run test:e2e

# Run with coverage report
npm run test:e2e -- --coverage

# Run in watch mode during development
npm run test:e2e -- --watch
```

## 📊 Test Structure

### Common Test Patterns

All e2e tests follow consistent patterns:

- **Authentication Setup**: Each test file obtains JWT tokens for different roles
- **Test Data Creation**: Creates necessary test entities (vehicles, routes, users)
- **Cleanup**: Removes test data after completion
- **Error Handling**: Tests both success and failure scenarios
- **Role-based Testing**: Verifies permissions for different user roles

### Test Data Credentials

The tests use the following seeded user accounts:

- **Admin**: `admin@logitrack.com` / `admin123`
- **Logistics**: `logistica@logitrack.com` / `logistica123`
- **Driver 1**: `conductor1@logitrack.com` / `conductor123`
- **Driver 2**: `conductor2@logitrack.com` / `conductor123`

### API Endpoints Tested

#### Authentication

- `POST /auth/login`
- `POST /auth/register`
- `GET /auth/google`
- `GET /auth/google/redirect`

#### Users

- `GET /users`
- `POST /users`
- `GET /users/:id`
- `PATCH /users/:id`
- `DELETE /users/:id`
- `PATCH /users/:id/activate`
- `PATCH /users/:id/deactivate`
- `GET /users/profile`
- `PATCH /users/profile`

#### Vehicles

- `GET /vehicles`
- `POST /vehicles`
- `GET /vehicles/:id`
- `PATCH /vehicles/:id`
- `PATCH /vehicles/:id/driver-update`
- `PATCH /vehicles/:id/assign`
- `PATCH /vehicles/:id/unassign`
- `PATCH /vehicles/:id/retire`
- `DELETE /vehicles/:id`

#### Scheduled Routes

- `GET /scheduled-routes`
- `POST /scheduled-routes`
- `GET /scheduled-routes/:id`
- `PATCH /scheduled-routes/:id`
- `GET /scheduled-routes/available-vehicles`
- `GET /scheduled-routes/available-drivers`

#### Route Points

- `GET /route-points`
- `POST /route-points`
- `GET /route-points/:id`
- `PATCH /route-points/:id`
- `DELETE /route-points/:id`

#### GPS Events

- `GET /gps-events`
- `POST /gps-events`
- `GET /gps-events/:id`
- `GET /gps-events/vehicle/:vehicleId`
- `GET /gps-events/route/:routeId`
- `GET /gps-events/stats`

#### Vehicle Check-ins

- `POST /vehicle-checkins/checkin`
- `POST /vehicle-checkins/checkout/:vehicleId`
- `GET /vehicle-checkins`
- `GET /vehicle-checkins/:id`
- `GET /vehicle-checkins/vehicle/:vehicleId`
- `GET /vehicle-checkins/driver/:driverId`
- `GET /vehicle-checkins/vehicle/:vehicleId/status`

#### Maintenance

- `GET /maintenance`
- `POST /maintenance/vehicles/:vehicleId/maintenance`
- `GET /maintenance/:id`
- `PATCH /maintenance/:id`
- `GET /maintenance/vehicles/:vehicleId/maintenance`

#### Maps

- `GET /maps/distance`
- `GET /maps/directions`
- `GET /maps/geocode`
- `GET /maps/route/complete`

## 🔧 Configuration

### Jest Configuration

The e2e tests use a separate Jest configuration in `test/jest-e2e.json`:

```json
{
  "moduleFileExtensions": ["js", "json", "ts"],
  "rootDir": ".",
  "testEnvironment": "node",
  "testRegex": ".e2e-spec.ts$",
  "transform": {
    "^.+\\.(t|j)s$": "ts-jest"
  }
}
```

### Environment Variables Required

```env
# Database
MONGODB_URI=mongodb://localhost:27017/logitrack-test

# JWT
JWT_SECRET=your-jwt-secret

# Google Maps (for maps tests)
GOOGLE_MAPS_API_KEY=your-google-maps-api-key

# Server
PORT=3000
```

## 🐛 Troubleshooting

### Common Issues

1. **Database Connection Errors**

   ```bash
   # Start MongoDB
   mongod --dbpath /path/to/your/db

   # Or use Docker
   docker run -d -p 27017:27017 mongo:latest
   ```

2. **Test Data Missing**

   ```bash
   # Re-run seeders
   npm run seed

   # Verify seeded data
   npm run test:data
   ```

3. **Google Maps API Errors**
   - Verify API key is valid and has required permissions
   - Enable required APIs: Maps JavaScript API, Geocoding API, Directions API
   - Check API quotas and billing

4. **Port Conflicts**

   ```bash
   # Kill processes using the port
   lsof -ti:3000 | xargs kill -9

   # Or use different port
   PORT=3001 npm run test:e2e
   ```

5. **Memory Issues**
   ```bash
   # Increase Node.js memory limit
   NODE_OPTIONS="--max_old_space_size=4096" npm run test:e2e
   ```

### Test Debugging

```bash
# Run with debug output
DEBUG=* npm run test:e2e

# Run single test with debugging
npx jest test/e2e/auth.e2e-spec.ts --verbose --detectOpenHandles

# Run with coverage and detailed output
npm run test:e2e -- --verbose --coverage --detectOpenHandles
```

## 📈 Performance Considerations

### Optimization Tips

1. **Parallel Execution**: Tests run in parallel by default but may need sequential execution for database-dependent tests
2. **Test Data Isolation**: Each test file creates and cleans up its own test data
3. **Connection Pooling**: Uses shared database connections where possible
4. **Timeout Settings**: Configured appropriate timeouts for external API calls

### Monitoring Test Performance

```bash
# Run with timing information
npx jest test/e2e --verbose --detectSlowTestsThreshold=5000

# Profile memory usage
node --inspect-brk node_modules/.bin/jest test/e2e
```

## 🔄 Continuous Integration

### GitHub Actions Example

```yaml
name: E2E Tests
on: [push, pull_request]
jobs:
  test:
    runs-on: ubuntu-latest
    services:
      mongodb:
        image: mongo:5.0
        ports:
          - 27017:27017
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-node@v3
        with:
          node-version: '18'
      - run: npm ci
      - run: npm run seed
      - run: npm run test:e2e
        env:
          MONGODB_URI: mongodb://localhost:27017/logitrack-test
          JWT_SECRET: test-secret
          GOOGLE_MAPS_API_KEY: ${{ secrets.GOOGLE_MAPS_API_KEY }}
```

## 📝 Writing New E2E Tests

### Template Structure

```typescript
import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import * as request from 'supertest';
import { AppModule } from '../../src/app.module';

describe('YourModule (e2e)', () => {
  let app: INestApplication;
  let adminToken: string;
  // ... other tokens

  beforeAll(async () => {
    // Setup test module and authentication
  });

  afterAll(async () => {
    // Cleanup
  });

  describe('Your endpoint tests', () => {
    // Test cases
  });
});
```

### Best Practices

1. **Use descriptive test names** that explain the expected behavior
2. **Test both success and failure scenarios**
3. **Verify response structure and data types**
4. **Test authorization for different user roles**
5. **Clean up test data** to avoid test interference
6. **Use proper HTTP status code assertions**
7. **Test edge cases and boundary conditions**

## 🏆 Test Results

Expected test metrics:

- **Total Test Suites**: 8
- **Total Tests**: ~200+
- **Coverage**: >80% for API endpoints
- **Execution Time**: <2 minutes (depending on hardware and network)

Run `npm run test:e2e` to see detailed results and coverage reports.

