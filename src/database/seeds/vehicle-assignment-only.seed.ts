import * as mongoose from 'mongoose';
import * as dotenv from 'dotenv';
import { VehicleAssignmentSeeder } from './vehicle-assignment.seed';

// Load environment variables
dotenv.config();

async function runVehicleAssignmentSeed() {
  console.log('🚚 Starting vehicle assignment seeding...');

  // Create MongoDB connection
  const mongoUri =
    process.env.MONGODB_URI || 'mongodb://localhost:27017/logitrack';

  console.log(
    '📊 Connecting to:',
    mongoUri.includes('mongodb+srv') ? 'MongoDB Atlas' : 'Local MongoDB',
  );

  try {
    // Initialize the connection
    await mongoose.connect(mongoUri);
    console.log('✅ Database connection established');

    // Run vehicle assignment seeder
    const vehicleAssignmentSeeder = new VehicleAssignmentSeeder();
    await vehicleAssignmentSeeder.run();

    console.log('🎉 Vehicle assignment seeding completed successfully!');
  } catch (error) {
    console.error('❌ Vehicle assignment seeding failed:', error);
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
  runVehicleAssignmentSeed();
}

export { runVehicleAssignmentSeed };
