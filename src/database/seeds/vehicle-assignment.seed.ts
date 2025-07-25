import { Model } from 'mongoose';
import { Vehicle, VehicleSchema } from '../../vehicle/entities/vehicle.entity';
import { User, UserSchema } from '../../users/entities/user.entity';
import { VehicleStatus } from '../../vehicle/enums/vehicle-status.enum';
import { Role } from '../../auth/enums/role.enum';
import * as mongoose from 'mongoose';

export class VehicleAssignmentSeeder {
  private vehicleModel: Model<Vehicle>;
  private userModel: Model<User>;

  constructor() {
    this.vehicleModel = mongoose.model(Vehicle.name, VehicleSchema);
    this.userModel = mongoose.model(User.name, UserSchema);
  }

  async run(): Promise<void> {
    console.log('🚚 Seeding additional vehicles and assignments...');

    // Get existing drivers
    const drivers = await this.userModel.find({ role: Role.CONDUCTOR }).exec();

    if (drivers.length === 0) {
      console.log('❌ No drivers found. Please run user seed first.');
      return;
    }

    console.log(
      `👥 Found ${drivers.length} drivers: ${drivers.map((d) => `${d.firstName} ${d.lastName}`).join(', ')}`,
    );

    // Additional vehicles to create
    const additionalVehicles = [
      {
        plateNumber: 'PQR-678',
        brand: 'Mitsubishi',
        model: 'L200',
        year: 2021,
        vin: '1HGBH41JXMN109191',
        status: VehicleStatus.ACTIVO,
        mileage: 35000,
        fuelType: 'Diesel',
        capacity: 4.8,
      },
      {
        plateNumber: 'STU-901',
        brand: 'Volkswagen',
        model: 'Amarok',
        year: 2020,
        vin: '1HGBH41JXMN109192',
        status: VehicleStatus.ACTIVO,
        mileage: 42000,
        fuelType: 'Diesel',
        capacity: 5.2,
      },
      {
        plateNumber: 'VWX-234',
        brand: 'Mercedes-Benz',
        model: 'Sprinter',
        year: 2019,
        vin: '1HGBH41JXMN109193',
        status: VehicleStatus.ACTIVO,
        mileage: 68000,
        fuelType: 'Diesel',
        capacity: 8.0,
      },
      {
        plateNumber: 'YZA-567',
        brand: 'Ford',
        model: 'Transit',
        year: 2022,
        vin: '1HGBH41JXMN109194',
        status: VehicleStatus.ACTIVO,
        mileage: 18000,
        fuelType: 'Diesel',
        capacity: 7.5,
      },
      {
        plateNumber: 'BCD-890',
        brand: 'Toyota',
        model: 'Tacoma',
        year: 2021,
        vin: '1HGBH41JXMN109195',
        status: VehicleStatus.ACTIVO,
        mileage: 28000,
        fuelType: 'Gasolina',
        capacity: 4.0,
      },
      {
        plateNumber: 'EFG-123',
        brand: 'Chevrolet',
        model: 'Silverado',
        year: 2020,
        vin: '1HGBH41JXMN109196',
        status: VehicleStatus.ACTIVO,
        mileage: 55000,
        fuelType: 'Gasolina',
        capacity: 6.5,
      },
      {
        plateNumber: 'HIJ-456',
        brand: 'Nissan',
        model: 'NV3500',
        year: 2021,
        vin: '1HGBH41JXMN109197',
        status: VehicleStatus.ACTIVO,
        mileage: 32000,
        fuelType: 'Diesel',
        capacity: 9.0,
      },
      {
        plateNumber: 'KLM-789',
        brand: 'Isuzu',
        model: 'NQR',
        year: 2019,
        vin: '1HGBH41JXMN109198',
        status: VehicleStatus.ACTIVO,
        mileage: 72000,
        fuelType: 'Diesel',
        capacity: 12.0,
      },
      {
        plateNumber: 'NOP-012',
        brand: 'Hino',
        model: '300',
        year: 2022,
        vin: '1HGBH41JXMN109199',
        status: VehicleStatus.ACTIVO,
        mileage: 15000,
        fuelType: 'Diesel',
        capacity: 10.5,
      },
      {
        plateNumber: 'QRS-345',
        brand: 'Fuso',
        model: 'FJ',
        year: 2020,
        vin: '1HGBH41JXMN109200',
        status: VehicleStatus.ACTIVO,
        mileage: 48000,
        fuelType: 'Diesel',
        capacity: 11.0,
      },
    ];

    let driverIndex = 0;
    const createdVehicles: any[] = [];

    for (const vehicleData of additionalVehicles) {
      // Check if vehicle already exists
      const existingVehicle = await this.vehicleModel
        .findOne({ plateNumber: vehicleData.plateNumber })
        .exec();

      if (!existingVehicle) {
        // Assign driver (cycle through available drivers)
        const assignedDriver = drivers[driverIndex % drivers.length];

        const vehicle = new this.vehicleModel({
          ...vehicleData,
          assignedDriverId: assignedDriver._id,
          assignmentDate: new Date(),
          assignmentNotes: `Asignado automáticamente a ${assignedDriver.firstName} ${assignedDriver.lastName}`,
        });

        await vehicle.save();
        createdVehicles.push(vehicle);

        console.log(
          `✅ Created vehicle: ${vehicleData.plateNumber} - ${vehicleData.brand} ${vehicleData.model} (${vehicleData.status}) - Assigned to: ${assignedDriver.firstName} ${assignedDriver.lastName}`,
        );

        driverIndex++;
      } else {
        console.log(
          `⚠️  Vehicle ${vehicleData.plateNumber} already exists, skipping...`,
        );
      }
    }

    // Also assign drivers to existing vehicles that don't have drivers
    const unassignedVehicles = await this.vehicleModel
      .find({
        status: VehicleStatus.ACTIVO,
        assignedDriverId: { $exists: false },
      })
      .exec();

    console.log(
      `🔧 Found ${unassignedVehicles.length} unassigned active vehicles`,
    );

    for (let i = 0; i < unassignedVehicles.length; i++) {
      const vehicle = unassignedVehicles[i];
      const assignedDriver = drivers[i % drivers.length];

      vehicle.assignedDriverId = assignedDriver._id;
      vehicle.assignmentDate = new Date();
      vehicle.assignmentNotes = `Asignado automáticamente a ${assignedDriver.firstName} ${assignedDriver.lastName}`;

      await vehicle.save();

      console.log(
        `🔧 Assigned existing vehicle: ${vehicle.plateNumber} - ${vehicle.brand} ${vehicle.model} to: ${assignedDriver.firstName} ${assignedDriver.lastName}`,
      );
    }

    // Summary
    const totalActiveVehicles = await this.vehicleModel
      .find({ status: VehicleStatus.ACTIVO })
      .exec();

    const assignedVehicles = await this.vehicleModel
      .find({
        status: VehicleStatus.ACTIVO,
        assignedDriverId: { $exists: true, $ne: null },
      })
      .exec();

    console.log('\n📊 Vehicle Assignment Summary:');
    console.log(`🚛 Total active vehicles: ${totalActiveVehicles.length}`);
    console.log(
      `👥 Vehicles with assigned drivers: ${assignedVehicles.length}`,
    );
    console.log(
      `❌ Vehicles without drivers: ${totalActiveVehicles.length - assignedVehicles.length}`,
    );

    console.log('🎉 Vehicle assignment seeding completed!');
  }
}
