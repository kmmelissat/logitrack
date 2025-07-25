import { Model } from 'mongoose';
import { Vehicle, VehicleSchema } from '../../vehicle/entities/vehicle.entity';
import { User, UserSchema } from '../../users/entities/user.entity';
import { VehicleStatus } from '../../vehicle/enums/vehicle-status.enum';
import { Role } from '../../auth/enums/role.enum';
import * as mongoose from 'mongoose';

export class MoreVehiclesSeeder {
  private vehicleModel: Model<Vehicle>;
  private userModel: Model<User>;

  constructor() {
    this.vehicleModel = mongoose.model(Vehicle.name, VehicleSchema);
    this.userModel = mongoose.model(User.name, UserSchema);
  }

  async run(): Promise<void> {
    console.log('🚚 Seeding additional vehicles for new drivers...');

    // Get all drivers
    const drivers = await this.userModel.find({ role: Role.CONDUCTOR }).exec();

    if (drivers.length === 0) {
      console.log('❌ No drivers found. Please run driver seed first.');
      return;
    }

    console.log(`👥 Found ${drivers.length} drivers available for assignment`);

    // Additional vehicles to create
    const additionalVehicles = [
      {
        plateNumber: 'TUV-678',
        brand: 'Toyota',
        model: 'Hiace',
        year: 2021,
        vin: '1HGBH41JXMN109201',
        status: VehicleStatus.ACTIVO,
        mileage: 28000,
        fuelType: 'Diesel',
        capacity: 12.0,
      },
      {
        plateNumber: 'WXY-901',
        brand: 'Mercedes-Benz',
        model: 'Sprinter 2500',
        year: 2020,
        vin: '1HGBH41JXMN109202',
        status: VehicleStatus.ACTIVO,
        mileage: 45000,
        fuelType: 'Diesel',
        capacity: 14.0,
      },
      {
        plateNumber: 'ZAB-234',
        brand: 'Ford',
        model: 'E-Series',
        year: 2019,
        vin: '1HGBH41JXMN109203',
        status: VehicleStatus.ACTIVO,
        mileage: 62000,
        fuelType: 'Gasolina',
        capacity: 15.0,
      },
      {
        plateNumber: 'CDE-567',
        brand: 'Chevrolet',
        model: 'Express',
        year: 2022,
        vin: '1HGBH41JXMN109204',
        status: VehicleStatus.ACTIVO,
        mileage: 12000,
        fuelType: 'Gasolina',
        capacity: 13.5,
      },
      {
        plateNumber: 'FGH-890',
        brand: 'Nissan',
        model: 'NV3500 HD',
        year: 2021,
        vin: '1HGBH41JXMN109205',
        status: VehicleStatus.ACTIVO,
        mileage: 25000,
        fuelType: 'Diesel',
        capacity: 16.0,
      },
      {
        plateNumber: 'IJK-123',
        brand: 'Isuzu',
        model: 'NQR75',
        year: 2020,
        vin: '1HGBH41JXMN109206',
        status: VehicleStatus.ACTIVO,
        mileage: 38000,
        fuelType: 'Diesel',
        capacity: 18.0,
      },
      {
        plateNumber: 'LMN-456',
        brand: 'Hino',
        model: '500',
        year: 2021,
        vin: '1HGBH41JXMN109207',
        status: VehicleStatus.ACTIVO,
        mileage: 22000,
        fuelType: 'Diesel',
        capacity: 20.0,
      },
      {
        plateNumber: 'OPQ-789',
        brand: 'Fuso',
        model: 'FJ',
        year: 2019,
        vin: '1HGBH41JXMN109208',
        status: VehicleStatus.ACTIVO,
        mileage: 55000,
        fuelType: 'Diesel',
        capacity: 22.0,
      },
      {
        plateNumber: 'RST-012',
        brand: 'Mitsubishi',
        model: 'Fuso Canter',
        year: 2022,
        vin: '1HGBH41JXMN109209',
        status: VehicleStatus.ACTIVO,
        mileage: 8000,
        fuelType: 'Diesel',
        capacity: 8.5,
      },
      {
        plateNumber: 'UVW-345',
        brand: 'Volkswagen',
        model: 'Crafter',
        year: 2021,
        vin: '1HGBH41JXMN109210',
        status: VehicleStatus.ACTIVO,
        mileage: 32000,
        fuelType: 'Diesel',
        capacity: 17.0,
      },
      {
        plateNumber: 'XYZ-678',
        brand: 'Iveco',
        model: 'Daily',
        year: 2020,
        vin: '1HGBH41JXMN109211',
        status: VehicleStatus.ACTIVO,
        mileage: 42000,
        fuelType: 'Diesel',
        capacity: 19.0,
      },
      {
        plateNumber: 'AAA-901',
        brand: 'Peugeot',
        model: 'Boxer',
        year: 2021,
        vin: '1HGBH41JXMN109212',
        status: VehicleStatus.ACTIVO,
        mileage: 28000,
        fuelType: 'Diesel',
        capacity: 16.5,
      },
      {
        plateNumber: 'BBB-234',
        brand: 'Citroën',
        model: 'Jumper',
        year: 2020,
        vin: '1HGBH41JXMN109213',
        status: VehicleStatus.ACTIVO,
        mileage: 35000,
        fuelType: 'Diesel',
        capacity: 15.5,
      },
      {
        plateNumber: 'CCC-567',
        brand: 'Renault',
        model: 'Master',
        year: 2022,
        vin: '1HGBH41JXMN109214',
        status: VehicleStatus.ACTIVO,
        mileage: 15000,
        fuelType: 'Diesel',
        capacity: 18.5,
      },
      {
        plateNumber: 'DDD-890',
        brand: 'Opel',
        model: 'Movano',
        year: 2021,
        vin: '1HGBH41JXMN109215',
        status: VehicleStatus.ACTIVO,
        mileage: 25000,
        fuelType: 'Diesel',
        capacity: 17.5,
      },
      {
        plateNumber: 'EEE-123',
        brand: 'Fiat',
        model: 'Ducato',
        year: 2020,
        vin: '1HGBH41JXMN109216',
        status: VehicleStatus.ACTIVO,
        mileage: 40000,
        fuelType: 'Diesel',
        capacity: 16.0,
      },
      {
        plateNumber: 'FFF-456',
        brand: 'Seat',
        model: 'Alhambra',
        year: 2021,
        vin: '1HGBH41JXMN109217',
        status: VehicleStatus.ACTIVO,
        mileage: 22000,
        fuelType: 'Diesel',
        capacity: 7.0,
      },
      {
        plateNumber: 'GGG-789',
        brand: 'Skoda',
        model: 'Superb',
        year: 2020,
        vin: '1HGBH41JXMN109218',
        status: VehicleStatus.ACTIVO,
        mileage: 38000,
        fuelType: 'Diesel',
        capacity: 6.5,
      },
      {
        plateNumber: 'HHH-012',
        brand: 'Audi',
        model: 'A6 Avant',
        year: 2022,
        vin: '1HGBH41JXMN109219',
        status: VehicleStatus.ACTIVO,
        mileage: 12000,
        fuelType: 'Gasolina',
        capacity: 5.5,
      },
      {
        plateNumber: 'III-345',
        brand: 'BMW',
        model: 'X5',
        year: 2021,
        vin: '1HGBH41JXMN109220',
        status: VehicleStatus.ACTIVO,
        mileage: 28000,
        fuelType: 'Diesel',
        capacity: 6.0,
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

    console.log('🎉 Additional vehicles seeding completed!');
  }
}
