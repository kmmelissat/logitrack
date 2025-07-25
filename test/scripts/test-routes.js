const axios = require('axios');

// Configuration
const BASE_URL = 'http://localhost:3000';
let authToken = '';

// Test data
const testRoute = {
  name: 'Ruta San Salvador - Tegucigalpa',
  description: 'Ruta comercial diaria entre capitales',
  plannedStartDate: '2025-07-26T06:00:00.000Z',
  plannedEndDate: '2025-07-26T18:00:00.000Z',
  origin: 'Terminal San Salvador',
  destination: 'Terminal Tegucigalpa',
  estimatedDistance: 250.5,
  estimatedCost: 1500.0,
  notes: 'Carga frágil - manejo especial',
};

const testPoints = [
  {
    name: 'Terminal San Salvador',
    description: 'Punto de origen',
    type: 'origen',
    latitude: 13.6929,
    longitude: -89.2182,
    address: 'Terminal de Buses San Salvador',
    sequenceOrder: 1,
    plannedArrivalTime: '2025-07-26T06:00:00.000Z',
    plannedDepartureTime: '2025-07-26T06:30:00.000Z',
    estimatedStayMinutes: 30,
  },
  {
    name: 'Checkpoint Santa Ana',
    description: 'Punto de control intermedio',
    type: 'checkpoint',
    latitude: 13.9941,
    longitude: -89.5598,
    address: 'Santa Ana, El Salvador',
    sequenceOrder: 2,
    plannedArrivalTime: '2025-07-26T08:00:00.000Z',
    plannedDepartureTime: '2025-07-26T08:15:00.000Z',
    estimatedStayMinutes: 15,
    radiusMeters: 100,
  },
  {
    name: 'Terminal Tegucigalpa',
    description: 'Punto de destino',
    type: 'destino',
    latitude: 14.0723,
    longitude: -87.1921,
    address: 'Terminal de Buses Tegucigalpa',
    sequenceOrder: 3,
    plannedArrivalTime: '2025-07-26T17:30:00.000Z',
    plannedDepartureTime: '2025-07-26T18:00:00.000Z',
    estimatedStayMinutes: 30,
  },
];

// Helper function to make authenticated requests
async function makeRequest(method, endpoint, data = null) {
  const config = {
    method,
    url: `${BASE_URL}${endpoint}`,
    headers: {
      'Content-Type': 'application/json',
      ...(authToken && { Authorization: `Bearer ${authToken}` }),
    },
    ...(data && { data }),
  };

  try {
    const response = await axios(config);
    return response.data;
  } catch (error) {
    console.error(
      `❌ Error ${method} ${endpoint}:`,
      error.response?.data || error.message,
    );
    throw error;
  }
}

// Test functions
async function testAuthentication() {
  console.log('🔐 Testing authentication...');

  // Try to login with a test user
  try {
    const loginData = {
      email: 'admin@logitrack.com',
      password: 'admin123',
    };

    const response = await makeRequest('POST', '/auth/login', loginData);
    authToken = response.token;
    console.log('✅ Authentication successful');
    return true;
  } catch (error) {
    console.log(
      '⚠️  Authentication failed - you may need to register a user first',
    );
    console.log(
      '   You can still test the endpoints manually with a valid token',
    );
    return false;
  }
}

async function testAvailableVehicles() {
  console.log('\n🚚 Testing available vehicles...');

  try {
    const vehicles = await makeRequest(
      'GET',
      '/scheduled-routes/available-vehicles',
    );
    console.log(
      `✅ Found ${vehicles.length} available vehicles with assigned drivers`,
    );

    if (vehicles.length > 0) {
      const vehicle = vehicles[0];
      console.log(
        `   - ${vehicle.plateNumber}: ${vehicle.brand} ${vehicle.model}`,
      );
      console.log(
        `   - Assigned driver: ${vehicle.assignedDriverId?.firstName} ${vehicle.assignedDriverId?.lastName}`,
      );

      // Add vehicle and driver IDs to test route
      testRoute.vehicleId = vehicle._id;
      testRoute.driverId = vehicle.assignedDriverId._id;

      return true;
    } else {
      console.log('❌ No vehicles with assigned drivers found');
      console.log('   You need to assign drivers to vehicles first');
      return false;
    }
  } catch (error) {
    console.log('❌ Failed to get available vehicles');
    return false;
  }
}

async function testCreateRoute() {
  console.log('\n🛣️  Testing route creation...');

  if (!testRoute.vehicleId || !testRoute.driverId) {
    console.log('❌ Cannot create route - missing vehicle or driver ID');
    return null;
  }

  try {
    const route = await makeRequest('POST', '/scheduled-routes', testRoute);
    console.log('✅ Route created successfully');
    console.log(`   - ID: ${route._id}`);
    console.log(`   - Name: ${route.name}`);
    console.log(`   - Status: ${route.status}`);
    return route._id;
  } catch (error) {
    console.log('❌ Failed to create route');
    return null;
  }
}

async function testCreateRoutePoints(routeId) {
  console.log('\n📍 Testing route points creation...');

  if (!routeId) {
    console.log('❌ Cannot create route points - missing route ID');
    return;
  }

  for (const point of testPoints) {
    try {
      const routePoint = await makeRequest('POST', '/route-points', {
        ...point,
        scheduledRouteId: routeId,
      });
      console.log(`✅ Created point: ${point.name} (${point.type})`);
    } catch (error) {
      console.log(`❌ Failed to create point: ${point.name}`);
    }
  }
}

async function testListRoutes() {
  console.log('\n📋 Testing route listing...');

  try {
    const routes = await makeRequest('GET', '/scheduled-routes?page=1&limit=5');
    console.log(`✅ Found ${routes.data.length} routes`);

    routes.data.forEach((route) => {
      console.log(`   - ${route.name} (${route.status})`);
    });
  } catch (error) {
    console.log('❌ Failed to list routes');
  }
}

async function testUpdateRoute(routeId) {
  console.log('\n✏️  Testing route update...');

  if (!routeId) {
    console.log('❌ Cannot update route - missing route ID');
    return;
  }

  try {
    const updateData = {
      status: 'en_progreso',
      notes: 'Ruta iniciada según lo planificado',
    };

    const route = await makeRequest(
      'PATCH',
      `/scheduled-routes/${routeId}`,
      updateData,
    );
    console.log('✅ Route updated successfully');
    console.log(`   - New status: ${route.status}`);
    console.log(`   - Notes: ${route.notes}`);
  } catch (error) {
    console.log('❌ Failed to update route');
  }
}

// Main test function
async function runTests() {
  console.log('🚀 Starting route and route points tests...\n');

  // Test authentication
  await testAuthentication();

  // Test available vehicles
  const hasVehicles = await testAvailableVehicles();

  // Test route creation
  const routeId = await testCreateRoute();

  // Test route points creation
  await testCreateRoutePoints(routeId);

  // Test route listing
  await testListRoutes();

  // Test route update
  await testUpdateRoute(routeId);

  console.log('\n🎉 Tests completed!');
  console.log('\n📝 Next steps:');
  console.log('   1. Check the API documentation at http://localhost:3000/api');
  console.log(
    '   2. Use the test/TESTING_ROUTES.md guide for more detailed testing',
  );
  console.log('   3. Test the Google Maps integration for route calculation');
  console.log('   4. Run integration tests: npm run test:integration');
}

// Run tests if this file is executed directly
if (require.main === module) {
  runTests().catch(console.error);
}

module.exports = { runTests };
