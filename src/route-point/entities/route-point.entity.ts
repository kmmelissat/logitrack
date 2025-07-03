import {
  Entity,
  Column,
  PrimaryGeneratedColumn,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import { ScheduledRoute } from '../../scheduled-route/entities/scheduled-route.entity';

export enum PointType {
  ORIGEN = 'origen',
  DESTINO = 'destino',
  PARADA = 'parada',
  CHECKPOINT = 'checkpoint',
}

@Entity('route_points')
export class RoutePoint {
  @PrimaryGeneratedColumn()
  id: number;

  @Column()
  name: string;

  @Column('text', { nullable: true })
  description: string;

  @Column({
    type: 'enum',
    enum: PointType,
    default: PointType.PARADA,
  })
  type: PointType;

  @Column({ type: 'decimal', precision: 10, scale: 8 })
  latitude: number;

  @Column({ type: 'decimal', precision: 11, scale: 8 })
  longitude: number;

  @Column({ nullable: true })
  address: string;

  @Column({ type: 'int', default: 0 })
  sequenceOrder: number;

  @Column({ type: 'timestamp', nullable: true })
  plannedArrivalTime: Date;

  @Column({ type: 'timestamp', nullable: true })
  actualArrivalTime: Date;

  @Column({ type: 'timestamp', nullable: true })
  plannedDepartureTime: Date;

  @Column({ type: 'timestamp', nullable: true })
  actualDepartureTime: Date;

  @Column({ type: 'int', nullable: true })
  estimatedStayMinutes: number;

  @Column({ type: 'decimal', precision: 10, scale: 2, nullable: true })
  radiusMeters: number;

  @Column({ default: false })
  isCompleted: boolean;

  @Column({ type: 'text', nullable: true })
  notes: string;

  // Relación
  @ManyToOne(
    () => ScheduledRoute,
    (scheduledRoute) => scheduledRoute.routePoints,
  )
  @JoinColumn({ name: 'scheduledRouteId' })
  scheduledRoute: ScheduledRoute;

  @Column()
  scheduledRouteId: number;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
