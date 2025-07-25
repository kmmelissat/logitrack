# Test Directory Structure

This directory contains all test files for the LogiTrack API, organized by type and purpose.

## 📁 Directory Structure

```
test/
├── README.md                           # This file
├── jest-e2e.json                      # Jest configuration for e2e tests
├── app.e2e-spec.ts                    # End-to-end tests for the app
├── integration/                       # Integration tests
│   └── scheduled-route.integration.spec.ts
├── e2e/                              # End-to-end tests (future)
├── scripts/                          # Test scripts and utilities
│   ├── test-routes.js                # Automated route testing script
│   └── assign-drivers.js             # Driver assignment script
├── TESTING_ROUTES.md                 # Comprehensive testing guide
├── ROUTES_TESTING_SUMMARY.md         # Test results summary
└── LogiTrack_Routes.postman_collection.json  # Postman collection
```

## 🧪 Test Types

### **Integration Tests** (`integration/`)

- Test the interaction between different modules
- Use mocked dependencies to isolate components
- Test API endpoints with proper authentication
- Located in `test/integration/`

### **End-to-End Tests** (`e2e/`)

- Test the complete application flow
- Use real database connections
- Test full user journeys
- Located in `test/e2e/`

### **Test Scripts** (`scripts/`)

- Utility scripts for testing and setup
- Automated testing scripts
- Data setup and cleanup scripts
- Located in `test/scripts/`

## 🚀 Running Tests

### **Unit Tests**

```bash
npm run test
```

### **Integration Tests**

```bash
npm run test:integration
```

### **End-to-End Tests**

```bash
npm run test:e2e
```

### **All Tests**

```bash
npm run test:all
```

## 📋 Test Scripts

### **Automated Route Testing**

```bash
# Run the automated route testing script
node test/scripts/test-routes.js
```

### **Driver Assignment Setup**

```bash
# Assign drivers to vehicles for testing
node test/scripts/assign-drivers.js
```

## 📖 Documentation

### **Testing Guide**

- `TESTING_ROUTES.md` - Comprehensive guide for testing routes and route points
- `ROUTES_TESTING_SUMMARY.md` - Summary of test results and validation

### **API Testing**

- `LogiTrack_Routes.postman_collection.json` - Postman collection for manual testing

## 🔧 Test Configuration

### **Jest Configuration**

- `jest-e2e.json` - Configuration for end-to-end tests
- Uses `supertest` for HTTP testing
- Includes proper timeout and setup configurations

### **Test Environment**

- Tests run against a test database
- Authentication tokens are managed automatically
- Mock data is provided for consistent testing

## 📊 Test Coverage

### **Current Coverage**

- ✅ Authentication endpoints
- ✅ Scheduled routes CRUD operations
- ✅ Route points management
- ✅ Vehicle-driver assignment validation
- ✅ Route status updates
- ✅ Pagination and filtering

### **Planned Coverage**

- 🔄 Google Maps integration
- 🔄 GPS event tracking
- 🔄 Maintenance scheduling
- 🔄 Real-time notifications
- 🔄 Analytics and reporting

## 🛠️ Writing Tests

### **Integration Test Template**

```typescript
import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import * as request from 'supertest';
import { AppModule } from '../../src/app.module';

describe('ModuleName Integration Tests', () => {
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

  it('should test something', async () => {
    const response = await request(app.getHttpServer())
      .get('/endpoint')
      .set('Authorization', `Bearer ${token}`);

    expect(response.status).toBe(200);
  });
});
```

### **Test Script Template**

```javascript
const axios = require('axios');

async function testFunction() {
  try {
    const response = await axios.get('http://localhost:3000/endpoint');
    console.log('✅ Test passed:', response.data);
  } catch (error) {
    console.error('❌ Test failed:', error.message);
  }
}

if (require.main === module) {
  testFunction();
}
```

## 🔍 Best Practices

1. **Use Descriptive Test Names**: Test names should clearly describe what is being tested
2. **Arrange-Act-Assert**: Structure tests with clear setup, action, and verification
3. **Mock External Dependencies**: Use mocks for database, external APIs, and services
4. **Test Error Cases**: Include tests for error conditions and edge cases
5. **Clean Up**: Always clean up test data and reset mocks
6. **Use Test Data**: Create consistent test data for reliable tests

## 📝 Notes

- All tests should be independent and not rely on other tests
- Use proper authentication tokens for protected endpoints
- Mock external services to avoid dependencies
- Include both positive and negative test cases
- Document any special setup requirements

---

**Last Updated**: July 25, 2025  
**Version**: 1.0.0
