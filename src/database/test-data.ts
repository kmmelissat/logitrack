import { DataSource } from 'typeorm';
import { User } from '../users/entities/user.entity';
import { Vehicle } from '../vehicle/entities/vehicle.entity';
import { Maintenance } from '../maintenance/entities/maintenance.entity';
import { ScheduledRoute } from '../scheduled-route/entities/scheduled-route.entity';
import { RoutePoint } from '../route-point/entities/route-point.entity';
import { VehicleCheckin } from '../vehicle-checkin/entities/vehicle-checkin.entity';
import { GpsEvent } from '../gps-event/entities/gps-event.entity';

async function testData() {
  console.log('🔍 Testing seeded data...');

  // Create DataSource configuration
  const dataSource = new DataSource({
    type: 'postgres',
    host: process.env.DB_HOST || 'localhost',
    port: parseInt(process.env.DB_PORT || '5432', 10),
    username: process.env.DB_USERNAME || 'postgres',
    password: process.env.DB_PASSWORD || 'postgres',
    database: process.env.DB_NAME || 'logitrack',
    entities: [
      User,
      Vehicle,
      Maintenance,
      ScheduledRoute,
      RoutePoint,
      VehicleCheckin,
      GpsEvent,
    ],
    synchronize: false,
    logging: false,
  });

  try {
    // Initialize the connection
    await dataSource.initialize();
    console.log('✅ Database connection established');

    // Test users
    const userRepository = dataSource.getRepository(User);
    const users = await userRepository.find();
    console.log('\n👥 Users in database:');
    users.forEach((user) => {
      console.log(
        `  - ${user.firstName} ${user.lastName} (${user.email}) - ${user.role}`,
      );
    });

    // Test vehicles
    const vehicleRepository = dataSource.getRepository(Vehicle);
    const vehicles = await vehicleRepository.find();
    console.log('\n🚚 Vehicles in database:');
    vehicles.forEach((vehicle) => {
      console.log(
        `  - ${vehicle.plateNumber}: ${vehicle.brand} ${vehicle.model} ${vehicle.year} - ${vehicle.status} (${vehicle.capacity}t)`,
      );
    });

    console.log('\n✅ Data test completed successfully!');
  } catch (error) {
    console.error('❌ Data test failed:', error);
    process.exit(1);
  } finally {
    // Close the connection
    await dataSource.destroy();
    console.log('🔌 Database connection closed');
    process.exit(0);
  }
}

// Run the test if this file is executed directly
if (require.main === module) {
  testData();
}

export { testData };
