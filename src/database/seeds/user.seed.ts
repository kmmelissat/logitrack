import { DataSource } from 'typeorm';
import * as bcrypt from 'bcrypt';
import { User } from '../../users/entities/user.entity';
import { Role } from '../../auth/enums/role.enum';

export class UserSeeder {
  constructor(private dataSource: DataSource) {}

  async run(): Promise<void> {
    const userRepository = this.dataSource.getRepository(User);

    // Sample users with different roles
    const usersToCreate = [
      {
        email: 'admin@logitrack.com',
        firstName: 'Admin',
        lastName: 'Sistema',
        password: await bcrypt.hash('admin123', 10),
        role: Role.ADMIN,
      },
      {
        email: 'logistica@logitrack.com',
        firstName: 'María',
        lastName: 'Logística',
        password: await bcrypt.hash('logistica123', 10),
        role: Role.LOGISTICA,
      },
      {
        email: 'conductor1@logitrack.com',
        firstName: 'Juan',
        lastName: 'Pérez',
        password: await bcrypt.hash('conductor123', 10),
        role: Role.CONDUCTOR,
      },
      {
        email: 'conductor2@logitrack.com',
        firstName: 'Carlos',
        lastName: 'Rodríguez',
        password: await bcrypt.hash('conductor123', 10),
        role: Role.CONDUCTOR,
      },
      {
        email: 'logistica2@logitrack.com',
        firstName: 'Ana',
        lastName: 'García',
        password: await bcrypt.hash('logistica123', 10),
        role: Role.LOGISTICA,
      },
    ];

    console.log('🌱 Seeding users...');

    for (const userData of usersToCreate) {
      // Check if user already exists
      const existingUser = await userRepository.findOne({
        where: { email: userData.email },
      });

      if (!existingUser) {
        const user = userRepository.create(userData);
        await userRepository.save(user);
        console.log(
          `✅ Created user: ${userData.firstName} ${userData.lastName} (${userData.role})`,
        );
      } else {
        console.log(`⚠️  User ${userData.email} already exists, skipping...`);
      }
    }

    console.log('🎉 User seeding completed!');
  }
}
