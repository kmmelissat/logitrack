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
import { User } from '../../users/entities/user.entity';
import { ScheduledRoute } from '../../scheduled-route/entities/scheduled-route.entity';

export enum CheckinType {
  CHECK_IN = 'check_in',
  CHECK_OUT = 'check_out',
}

@Entity('vehicle_checkins')
export class VehicleCheckin {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({
    type: 'enum',
    enum: CheckinType,
  })
  type: CheckinType;

  @Column({ type: 'timestamp' })
  timestamp: Date;

  @Column({ type: 'decimal', precision: 10, scale: 8, nullable: true })
  latitude: number;

  @Column({ type: 'decimal', precision: 11, scale: 8, nullable: true })
  longitude: number;

  @Column({ nullable: true })
  location: string;

  @Column({ type: 'int', nullable: true })
  mileage: number;

  @Column({ type: 'decimal', precision: 5, scale: 2, nullable: true })
  fuelLevel: number;

  @Column({ type: 'text', nullable: true })
  notes: string;

  @Column({ type: 'json', nullable: true })
  vehicleCondition: {
    engineOk: boolean;
    tiresOk: boolean;
    lightsOk: boolean;
    brakesOk: boolean;
    documentsOk: boolean;
    issues?: string[];
  };

  @Column({ type: 'json', nullable: true })
  photos: string[];

  @Column({ default: true })
  isValid: boolean;

  // Relaciones
  @ManyToOne(() => Vehicle, (vehicle) => vehicle.vehicleCheckins)
  @JoinColumn({ name: 'vehicleId' })
  vehicle: Vehicle;

  @Column()
  vehicleId: number;

  @ManyToOne(() => User, (user) => user.vehicleCheckins)
  @JoinColumn({ name: 'driverId' })
  driver: User;

  @Column()
  driverId: number;

  @ManyToOne(
    () => ScheduledRoute,
    (scheduledRoute) => scheduledRoute.vehicleCheckins,
    { nullable: true },
  )
  @JoinColumn({ name: 'scheduledRouteId' })
  scheduledRoute: ScheduledRoute;

  @Column({ nullable: true })
  scheduledRouteId: number;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
