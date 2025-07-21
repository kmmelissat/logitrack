import * as mongoose from 'mongoose';
import * as dotenv from 'dotenv';
import { UserSeeder } from './user.seed';

// Load environment variables
dotenv.config();

async function seedUsers() {
  console.log('🚀 Starting user seeding...');

  // Create MongoDB connection
  const mongoUri =
    process.env.MONGODB_URI || 'mongodb://localhost:27017/logitrack';
  
  console.log('📊 Connecting to:', mongoUri.includes('mongodb+srv') ? 'MongoDB Atlas' : 'Local MongoDB');

  try {
    // Initialize the connection
    await mongoose.connect(mongoUri);
    console.log('✅ Database connection established');

    // Run user seeder only
    const userSeeder = new UserSeeder();
    await userSeeder.run();

    console.log('🎉 User seeding completed successfully!');
  } catch (error) {
    console.error('❌ User seeding failed:', error);
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
  seedUsers();
}

export { seedUsers };
