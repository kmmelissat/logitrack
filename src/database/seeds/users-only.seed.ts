import { DataSource } from 'typeorm';
import { UserSeeder } from './user.seed';

// Import all entities
import { User } from '../../users/entities/user.entity';
import { Vehicle } from '../../vehicle/entities/vehicle.entity';
import { Maintenance } from '../../maintenance/entities/maintenance.entity';
import { ScheduledRoute } from '../../scheduled-route/entities/scheduled-route.entity';
import { RoutePoint } from '../../route-point/entities/route-point.entity';
import { VehicleCheckin } from '../../vehicle-checkin/entities/vehicle-checkin.entity';
import { GpsEvent } from '../../gps-event/entities/gps-event.entity';

async function seedUsers() {
  console.log('🚀 Starting user seeding...');

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

    // Run user seeder only
    const userSeeder = new UserSeeder(dataSource);
    await userSeeder.run();

    console.log('🎉 User seeding completed successfully!');
  } catch (error) {
    console.error('❌ User seeding failed:', error);
    process.exit(1);
  } finally {
    // Close the connection
    await dataSource.destroy();
    console.log('🔌 Database connection closed');
    process.exit(0);
  }
}

// Run the seeding if this file is executed directly
if (require.main === module) {
  seedUsers();
}

export { seedUsers };
