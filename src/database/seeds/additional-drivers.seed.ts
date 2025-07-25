import { Model } from 'mongoose';
import * as bcrypt from 'bcrypt';
import { User, UserSchema } from '../../users/entities/user.entity';
import { Role } from '../../auth/enums/role.enum';
import * as mongoose from 'mongoose';

export class AdditionalDriversSeeder {
  private userModel: Model<User>;

  constructor() {
    this.userModel = mongoose.model(User.name, UserSchema);
  }

  async run(): Promise<void> {
    console.log('👥 Seeding additional drivers...');

    // Additional drivers to create
    const additionalDrivers = [
      {
        email: 'conductor3@logitrack.com',
        firstName: 'Miguel',
        lastName: 'González',
        password: await bcrypt.hash('conductor123', 10),
        role: Role.CONDUCTOR,
      },
      {
        email: 'conductor4@logitrack.com',
        firstName: 'Roberto',
        lastName: 'Martínez',
        password: await bcrypt.hash('conductor123', 10),
        role: Role.CONDUCTOR,
      },
      {
        email: 'conductor5@logitrack.com',
        firstName: 'Fernando',
        lastName: 'López',
        password: await bcrypt.hash('conductor123', 10),
        role: Role.CONDUCTOR,
      },
      {
        email: 'conductor6@logitrack.com',
        firstName: 'Alejandro',
        lastName: 'Hernández',
        password: await bcrypt.hash('conductor123', 10),
        role: Role.CONDUCTOR,
      },
      {
        email: 'conductor7@logitrack.com',
        firstName: 'Ricardo',
        lastName: 'Morales',
        password: await bcrypt.hash('conductor123', 10),
        role: Role.CONDUCTOR,
      },
      {
        email: 'conductor8@logitrack.com',
        firstName: 'Daniel',
        lastName: 'Castro',
        password: await bcrypt.hash('conductor123', 10),
        role: Role.CONDUCTOR,
      },
      {
        email: 'conductor9@logitrack.com',
        firstName: 'Luis',
        lastName: 'Reyes',
        password: await bcrypt.hash('conductor123', 10),
        role: Role.CONDUCTOR,
      },
      {
        email: 'conductor10@logitrack.com',
        firstName: 'Eduardo',
        lastName: 'Flores',
        password: await bcrypt.hash('conductor123', 10),
        role: Role.CONDUCTOR,
      },
      {
        email: 'conductor11@logitrack.com',
        firstName: 'Manuel',
        lastName: 'Vargas',
        password: await bcrypt.hash('conductor123', 10),
        role: Role.CONDUCTOR,
      },
      {
        email: 'conductor12@logitrack.com',
        firstName: 'Pablo',
        lastName: 'Jiménez',
        password: await bcrypt.hash('conductor123', 10),
        role: Role.CONDUCTOR,
      },
      {
        email: 'conductor13@logitrack.com',
        firstName: 'Arturo',
        lastName: 'Torres',
        password: await bcrypt.hash('conductor123', 10),
        role: Role.CONDUCTOR,
      },
      {
        email: 'conductor14@logitrack.com',
        firstName: 'Héctor',
        lastName: 'Ruiz',
        password: await bcrypt.hash('conductor123', 10),
        role: Role.CONDUCTOR,
      },
      {
        email: 'conductor15@logitrack.com',
        firstName: 'Francisco',
        lastName: 'Díaz',
        password: await bcrypt.hash('conductor123', 10),
        role: Role.CONDUCTOR,
      },
      {
        email: 'conductor16@logitrack.com',
        firstName: 'Alberto',
        lastName: 'Moreno',
        password: await bcrypt.hash('conductor123', 10),
        role: Role.CONDUCTOR,
      },
      {
        email: 'conductor17@logitrack.com',
        firstName: 'Jorge',
        lastName: 'Alvarez',
        password: await bcrypt.hash('conductor123', 10),
        role: Role.CONDUCTOR,
      },
      {
        email: 'conductor18@logitrack.com',
        firstName: 'Rafael',
        lastName: 'Romero',
        password: await bcrypt.hash('conductor123', 10),
        role: Role.CONDUCTOR,
      },
      {
        email: 'conductor19@logitrack.com',
        firstName: 'Mario',
        lastName: 'Navarro',
        password: await bcrypt.hash('conductor123', 10),
        role: Role.CONDUCTOR,
      },
      {
        email: 'conductor20@logitrack.com',
        firstName: 'Sergio',
        lastName: 'Mendoza',
        password: await bcrypt.hash('conductor123', 10),
        role: Role.CONDUCTOR,
      },
    ];

    let createdCount = 0;
    let skippedCount = 0;

    for (const driverData of additionalDrivers) {
      // Check if driver already exists
      const existingDriver = await this.userModel
        .findOne({ email: driverData.email })
        .exec();

      if (!existingDriver) {
        const driver = new this.userModel(driverData);
        await driver.save();
        createdCount++;
        console.log(
          `✅ Created driver: ${driverData.firstName} ${driverData.lastName} (${driverData.email})`,
        );
      } else {
        skippedCount++;
        console.log(
          `⚠️  Driver ${driverData.email} already exists, skipping...`,
        );
      }
    }

    // Summary
    const totalDrivers = await this.userModel
      .find({ role: Role.CONDUCTOR })
      .exec();

    console.log('\n📊 Driver Seeding Summary:');
    console.log(`👥 Total drivers in system: ${totalDrivers.length}`);
    console.log(`✅ New drivers created: ${createdCount}`);
    console.log(`⚠️  Drivers skipped (already exist): ${skippedCount}`);

    console.log('\n🎉 Additional drivers seeding completed!');
  }
}
