import { DataSource } from 'typeorm';
import { Vehicle } from '../../vehicle/entities/vehicle.entity';
import { VehicleStatus } from '../../vehicle/enums/vehicle-status.enum';

export class VehicleSeeder {
  constructor(private dataSource: DataSource) {}

  async run(): Promise<void> {
    const vehicleRepository = this.dataSource.getRepository(Vehicle);

    // Sample vehicles for testing
    const vehiclesToCreate = [
      {
        plateNumber: 'ABC-123',
        brand: 'Toyota',
        model: 'Hilux',
        year: 2020,
        vin: '1HGBH41JXMN109186',
        status: VehicleStatus.ACTIVO,
        mileage: 50000,
        fuelType: 'Diesel',
        capacity: 5.5,
      },
      {
        plateNumber: 'DEF-456',
        brand: 'Ford',
        model: 'Ranger',
        year: 2019,
        vin: '1HGBH41JXMN109187',
        status: VehicleStatus.ACTIVO,
        mileage: 75000,
        fuelType: 'Diesel',
        capacity: 4.2,
      },
      {
        plateNumber: 'GHI-789',
        brand: 'Chevrolet',
        model: 'Colorado',
        year: 2021,
        vin: '1HGBH41JXMN109188',
        status: VehicleStatus.TALLER,
        mileage: 25000,
        fuelType: 'Gasolina',
        capacity: 3.8,
      },
      {
        plateNumber: 'JKL-012',
        brand: 'Nissan',
        model: 'Frontier',
        year: 2018,
        vin: '1HGBH41JXMN109189',
        status: VehicleStatus.ACTIVO,
        mileage: 95000,
        fuelType: 'Diesel',
        capacity: 4.5,
      },
      {
        plateNumber: 'MNO-345',
        brand: 'Isuzu',
        model: 'D-Max',
        year: 2022,
        vin: '1HGBH41JXMN109190',
        status: VehicleStatus.DESCONTINUADO,
        mileage: 15000,
        fuelType: 'Diesel',
        capacity: 6.0,
      },
    ];

    console.log('🚚 Seeding vehicles...');

    for (const vehicleData of vehiclesToCreate) {
      // Check if vehicle already exists
      const existingVehicle = await vehicleRepository.findOne({
        where: { plateNumber: vehicleData.plateNumber },
      });

      if (!existingVehicle) {
        const vehicle = vehicleRepository.create(vehicleData);
        await vehicleRepository.save(vehicle);
        console.log(
          `✅ Created vehicle: ${vehicleData.plateNumber} - ${vehicleData.brand} ${vehicleData.model} (${vehicleData.status})`,
        );
      } else {
        console.log(
          `⚠️  Vehicle ${vehicleData.plateNumber} already exists, skipping...`,
        );
      }
    }

    console.log('🎉 Vehicle seeding completed!');
  }
}
