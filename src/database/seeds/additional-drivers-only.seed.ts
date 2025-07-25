import * as mongoose from 'mongoose';
import * as dotenv from 'dotenv';
import { AdditionalDriversSeeder } from './additional-drivers.seed';

// Load environment variables
dotenv.config();

async function runAdditionalDriversSeed() {
  console.log('👥 Starting additional drivers seeding...');

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

    // Run additional drivers seeder
    const additionalDriversSeeder = new AdditionalDriversSeeder();
    await additionalDriversSeeder.run();

    console.log('🎉 Additional drivers seeding completed successfully!');
  } catch (error) {
    console.error('❌ Additional drivers seeding failed:', error);
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
  runAdditionalDriversSeed();
}

export { runAdditionalDriversSeed };
