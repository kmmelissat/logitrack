import * as mongoose from 'mongoose';
import { UserSeeder } from './user.seed';
import { VehicleSeeder } from './vehicle.seed';

async function runSeeds() {
  console.log('🚀 Starting database seeding...');

  // Create MongoDB connection
  const mongoUri =
    process.env.MONGODB_URI || 'mongodb://localhost:27017/logitrack';

  try {
    // Initialize the connection
    await mongoose.connect(mongoUri);
    console.log('✅ Database connection established');

    // Run user seeder
    const userSeeder = new UserSeeder();
    await userSeeder.run();

    // Run vehicle seeder
    const vehicleSeeder = new VehicleSeeder();
    await vehicleSeeder.run();

    console.log('🎉 All seeds completed successfully!');
  } catch (error) {
    console.error('❌ Seeding failed:', error);
    process.exit(1);
  } finally {
    // Close the connection
    await mongoose.disconnect();
    console.log('🔌 Database connection closed');
    process.exit(0);
  }
}

// Run the seeding if this file is executed directly
if (require.main === module) {
  runSeeds();
}

export { runSeeds };
