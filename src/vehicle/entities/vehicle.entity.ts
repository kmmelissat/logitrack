import {
  Entity,
  Column,
  PrimaryGeneratedColumn,
  CreateDateColumn,
  UpdateDateColumn,
  OneToMany,
} from 'typeorm';
import { VehicleStatus } from '../enums/vehicle-status.enum';
import { Maintenance } from '../../maintenance/entities/maintenance.entity';

@Entity('vehicles')
export class Vehicle {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ unique: true })
  plateNumber: string;

  @Column()
  brand: string;

  @Column()
  model: string;

  @Column()
  year: number;

  @Column({ nullable: true })
  vin: string;

  @Column({
    type: 'enum',
    enum: VehicleStatus,
    default: VehicleStatus.ACTIVO,
  })
  status: VehicleStatus;

  @Column({ nullable: true })
  mileage: number;

  @Column({ nullable: true })
  fuelType: string;

  @Column({ nullable: true })
  capacity: number;

  @OneToMany(() => Maintenance, (maintenance) => maintenance.vehicle)
  maintenances: Maintenance[];

  // Relaciones - usar lazy loading para evitar referencias circulares
  @OneToMany('ScheduledRoute', 'vehicle')
  scheduledRoutes: Promise<any[]>;

  @OneToMany('VehicleCheckin', 'vehicle')
  vehicleCheckins: Promise<any[]>;

  @OneToMany('GpsEvent', 'vehicle')
  gpsEvents: Promise<any[]>;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
