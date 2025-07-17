import * as mongoose from 'mongoose';
import * as dotenv from 'dotenv';
import { User, UserSchema } from '../users/entities/user.entity';
import { Vehicle, VehicleSchema } from '../vehicle/entities/vehicle.entity';

// Load environment variables
dotenv.config();

async function testData() {
  console.log('🔍 Testing seeded data...');

  // Create MongoDB connection
  const mongoUri =
    process.env.MONGODB_URI || 'mongodb://localhost:27017/logitrack';
  
  console.log('📊 Connecting to:', mongoUri.includes('mongodb+srv') ? 'MongoDB Atlas' : 'Local MongoDB');

  try {
    // Initialize the connection
    await mongoose.connect(mongoUri);
    console.log('✅ Database connection established');

    // Create models
    const UserModel = mongoose.model(User.name, UserSchema);
    const VehicleModel = mongoose.model(Vehicle.name, VehicleSchema);

    // Test users
    const users = await UserModel.find().exec();
    console.log('\n👥 Users in database:');
    users.forEach((user) => {
      console.log(
        `  - ${user.firstName} ${user.lastName} (${user.email}) - ${user.role}`,
      );
    });

    // Test vehicles
    const vehicles = await VehicleModel.find().exec();
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
    await mongoose.disconnect();
    console.log('🔌 Database connection closed');
    process.exit(0);
  }
}

// Run the test if this file is executed directly
if (require.main === module) {
  testData();
}

export { testData };
