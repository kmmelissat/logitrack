import * as mongoose from 'mongoose';
import * as dotenv from 'dotenv';
import { MoreVehiclesSeeder } from './more-vehicles.seed';

// Load environment variables
dotenv.config();

async function runMoreVehiclesSeed() {
  console.log('🚚 Starting additional vehicles seeding...');

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

    // Run more vehicles seeder
    const moreVehiclesSeeder = new MoreVehiclesSeeder();
    await moreVehiclesSeeder.run();

    console.log('🎉 Additional vehicles seeding completed successfully!');
  } catch (error) {
    console.error('❌ Additional vehicles seeding failed:', error);
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
  runMoreVehiclesSeed();
}

export { runMoreVehiclesSeed };
