const axios = require('axios');

// Configuration
const BASE_URL = 'http://localhost:3000';
let authToken = '';

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

async function login() {
  console.log('🔐 Logging in...');

  try {
    const loginData = {
      email: 'admin@logitrack.com',
      password: 'admin123',
    };

    const response = await makeRequest('POST', '/auth/login', loginData);
    authToken = response.token;
    console.log('✅ Login successful');
    return true;
  } catch (error) {
    console.log('❌ Login failed');
    return false;
  }
}

async function getUsers() {
  console.log('\n👥 Getting users...');

  try {
    const users = await makeRequest('GET', '/users');
    console.log(`✅ Found ${users.length} users`);
    return users.filter((user) => user.role === 'conductor');
  } catch (error) {
    console.log('❌ Failed to get users');
    return [];
  }
}

async function getVehicles() {
  console.log('\n🚚 Getting vehicles...');

  try {
    const vehicles = await makeRequest('GET', '/vehicles');
    console.log(`✅ Found ${vehicles.length} vehicles`);
    return vehicles.filter((vehicle) => vehicle.status === 'activo');
  } catch (error) {
    console.log('❌ Failed to get vehicles');
    return [];
  }
}

async function assignDriverToVehicle(vehicleId, driverId) {
  console.log(`\n🔗 Assigning driver ${driverId} to vehicle ${vehicleId}...`);

  try {
    const assignmentData = {
      driverId: driverId,
      assignmentDate: new Date().toISOString(),
      notes: 'Assignment for testing routes',
    };

    const vehicle = await makeRequest(
      'PATCH',
      `/vehicles/${vehicleId}/assign`,
      assignmentData,
    );
    console.log(
      `✅ Successfully assigned driver to vehicle ${vehicle.plateNumber}`,
    );
    return vehicle;
  } catch (error) {
    console.log(`❌ Failed to assign driver to vehicle`);
    return null;
  }
}

async function main() {
  console.log('🚀 Starting driver assignment process...\n');

  // Login
  const loginSuccess = await login();
  if (!loginSuccess) {
    console.log('❌ Cannot proceed without authentication');
    return;
  }

  // Get drivers and vehicles
  const drivers = await getUsers();
  const vehicles = await getVehicles();

  if (drivers.length === 0) {
    console.log('❌ No drivers found');
    return;
  }

  if (vehicles.length === 0) {
    console.log('❌ No active vehicles found');
    return;
  }

  console.log(`\n📋 Available drivers:`);
  drivers.forEach((driver) => {
    console.log(`   - ${driver.firstName} ${driver.lastName} (${driver._id})`);
  });

  console.log(`\n📋 Available vehicles:`);
  vehicles.forEach((vehicle) => {
    console.log(
      `   - ${vehicle.plateNumber}: ${vehicle.brand} ${vehicle.model} (${vehicle._id})`,
    );
  });

  // Assign drivers to vehicles (one driver per vehicle)
  console.log('\n🔗 Assigning drivers to vehicles...');

  const assignments = [];
  for (let i = 0; i < Math.min(drivers.length, vehicles.length); i++) {
    const driver = drivers[i];
    const vehicle = vehicles[i];

    const assignedVehicle = await assignDriverToVehicle(
      vehicle._id,
      driver._id,
    );
    if (assignedVehicle) {
      assignments.push({
        vehicle: assignedVehicle,
        driver: driver,
      });
    }
  }

  console.log(`\n✅ Assignment process completed!`);
  console.log(
    `   Successfully assigned ${assignments.length} drivers to vehicles`,
  );

  if (assignments.length > 0) {
    console.log('\n📋 Assignments made:');
    assignments.forEach((assignment) => {
      console.log(
        `   - ${assignment.driver.firstName} ${assignment.driver.lastName} → ${assignment.vehicle.plateNumber}`,
      );
    });

    console.log(
      '\n🎉 You can now test routes with these vehicle-driver combinations!',
    );
    console.log('\n📝 Next steps:');
    console.log('   1. Run: npm run test:routes');
    console.log(
      '   2. Or use the Postman collection: test/LogiTrack_Routes.postman_collection.json',
    );
    console.log('   3. Or follow the guide: test/TESTING_ROUTES.md');
    console.log('   4. Run integration tests: npm run test:integration');
  }
}

// Run if this file is executed directly
if (require.main === module) {
  main().catch(console.error);
}

module.exports = { main };
