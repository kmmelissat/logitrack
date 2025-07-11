import { DataSource } from 'typeorm';
import { ConfigService } from '@nestjs/config';
import { UserSeeder } from './user.seed';
import { VehicleSeeder } from './vehicle.seed';

// Import all entities
import { User } from '../../users/entities/user.entity';
import { Vehicle } from '../../vehicle/entities/vehicle.entity';
import { Maintenance } from '../../maintenance/entities/maintenance.entity';
import { ScheduledRoute } from '../../scheduled-route/entities/scheduled-route.entity';
import { RoutePoint } from '../../route-point/entities/route-point.entity';
import { VehicleCheckin } from '../../vehicle-checkin/entities/vehicle-checkin.entity';
import { GpsEvent } from '../../gps-event/entities/gps-event.entity';

async function runSeeds() {
  console.log('🚀 Starting database seeding...');

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
    synchronize: false, // Don't auto-sync in production
    logging: false,
  });

  try {
    // Initialize the connection
    await dataSource.initialize();
    console.log('✅ Database connection established');

    // Run user seeder
    const userSeeder = new UserSeeder(dataSource);
    await userSeeder.run();

    // Run vehicle seeder
    const vehicleSeeder = new VehicleSeeder(dataSource);
    await vehicleSeeder.run();

    console.log('🎉 All seeds completed successfully!');
  } catch (error) {
    console.error('❌ Seeding failed:', error);
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
  runSeeds();
}

export { runSeeds };
