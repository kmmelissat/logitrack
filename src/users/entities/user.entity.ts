import {
  Entity,
  Column,
  PrimaryGeneratedColumn,
  CreateDateColumn,
  UpdateDateColumn,
  OneToMany,
} from 'typeorm';
import { Role } from '../../auth/enums/role.enum';

@Entity('users')
export class User {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ unique: true })
  email: string;

  @Column()
  firstName: string;

  @Column()
  lastName: string;

  @Column({ nullable: true })
  picture: string;

  @Column({ nullable: true })
  googleId: string;

  @Column({ nullable: true })
  password: string;

  @Column({
    type: 'enum',
    enum: Role,
    default: Role.CONDUCTOR,
  })
  role: Role;

  // Relaciones - usar lazy loading para evitar referencias circulares
  @OneToMany('ScheduledRoute', 'driver')
  assignedRoutes: Promise<any[]>;

  @OneToMany('VehicleCheckin', 'driver')
  vehicleCheckins: Promise<any[]>;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
