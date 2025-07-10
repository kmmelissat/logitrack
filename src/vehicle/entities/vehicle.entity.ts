import { Entity, PrimaryGeneratedColumn, Column } from 'typeorm';
import { EstadoVehiculo } from '../enums/estado-vehiculo.enum';

@Entity('vehicles')
export class Vehicle {
  @PrimaryGeneratedColumn()
  id: number;

  @Column()
  marca: string;

  @Column()
  modelo: string;

  @Column()
  año: number;

  @Column({
    type: 'enum',
    enum: EstadoVehiculo,
    default: EstadoVehiculo.ACTIVO,
  })
  estado: EstadoVehiculo;
} 