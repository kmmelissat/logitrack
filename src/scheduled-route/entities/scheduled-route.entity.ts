import {
  Entity,
  Column,
  PrimaryGeneratedColumn,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  OneToMany,
  JoinColumn,
} from 'typeorm';
import { Vehicle } from '../../vehicle/entities/vehicle.entity';
import { User } from '../../users/entities/user.entity';
import { RoutePoint } from '../../route-point/entities/route-point.entity';
import { VehicleCheckin } from '../../vehicle-checkin/entities/vehicle-checkin.entity';
import { GpsEvent } from '../../gps-event/entities/gps-event.entity';

export enum RouteStatus {
  PLANIFICADA = 'planificada',
  EN_PROGRESO = 'en_progreso',
  COMPLETADA = 'completada',
  CANCELADA = 'cancelada',
}

@Entity('scheduled_routes')
export class ScheduledRoute {
  @PrimaryGeneratedColumn()
  id: number;

  @Column()
  name: string;

  @Column('text', { nullable: true })
  description: string;

  @Column({ type: 'date' })
  plannedStartDate: Date;

  @Column({ type: 'date' })
  plannedEndDate: Date;

  @Column({ type: 'timestamp', nullable: true })
  actualStartTime: Date;

  @Column({ type: 'timestamp', nullable: true })
  actualEndTime: Date;

  @Column({
    type: 'enum',
    enum: RouteStatus,
    default: RouteStatus.PLANIFICADA,
  })
  status: RouteStatus;

  @Column({ type: 'decimal', precision: 10, scale: 2, nullable: true })
  estimatedDistance: number;

  @Column({ type: 'decimal', precision: 10, scale: 2, nullable: true })
  actualDistance: number;

  @Column({ nullable: true })
  origin: string;

  @Column({ nullable: true })
  destination: string;

  @Column({ type: 'decimal', precision: 10, scale: 2, nullable: true })
  estimatedCost: number;

  @Column({ type: 'text', nullable: true })
  notes: string;

  // Relaciones
  @ManyToOne(() => Vehicle, (vehicle) => vehicle.scheduledRoutes)
  @JoinColumn({ name: 'vehicleId' })
  vehicle: Vehicle;

  @Column()
  vehicleId: number;

  @ManyToOne(() => User, (user) => user.assignedRoutes)
  @JoinColumn({ name: 'driverId' })
  driver: User;

  @Column()
  driverId: number;

  @OneToMany(() => RoutePoint, (routePoint) => routePoint.scheduledRoute)
  routePoints: RoutePoint[];

  @OneToMany(() => VehicleCheckin, (checkin) => checkin.scheduledRoute)
  vehicleCheckins: VehicleCheckin[];

  @OneToMany(() => GpsEvent, (gpsEvent) => gpsEvent.scheduledRoute)
  gpsEvents: GpsEvent[];

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
