import {
  Entity,
  Column,
  PrimaryGeneratedColumn,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import { Vehicle } from '../../vehicle/entities/vehicle.entity';

@Entity('maintenances')
export class Maintenance {
  @PrimaryGeneratedColumn()
  id: number;

  @Column()
  type: string;

  @Column('text')
  description: string;

  @Column({ type: 'date' })
  maintenanceDate: Date;

  @Column({ type: 'decimal', precision: 10, scale: 2 })
  cost: number;

  @Column({ nullable: true })
  provider: string;

  @Column({ nullable: true })
  mileageAtMaintenance: number;

  @Column({ nullable: true })
  nextMaintenanceDate: Date;

  @Column({ nullable: true })
  nextMaintenanceMileage: number;

  @Column({ default: true })
  isCompleted: boolean;

  @ManyToOne(() => Vehicle, (vehicle) => vehicle.maintenances)
  @JoinColumn({ name: 'vehicleId' })
  vehicle: Vehicle;

  @Column()
  vehicleId: number;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
