import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Maintenance } from './entities/maintenance.entity';
import { CreateMaintenanceDto } from './dto/create-maintenance.dto';
import { UpdateMaintenanceDto } from './dto/update-maintenance.dto';

@Injectable()
export class MaintenanceService {
  constructor(
    @InjectRepository(Maintenance)
    private maintenanceRepository: Repository<Maintenance>,
  ) {}

  async create(
    createMaintenanceDto: CreateMaintenanceDto,
  ): Promise<Maintenance> {
    const maintenance = this.maintenanceRepository.create(createMaintenanceDto);
    return this.maintenanceRepository.save(maintenance);
  }

  async findAll(): Promise<Maintenance[]> {
    return this.maintenanceRepository.find({
      relations: ['vehicle'],
    });
  }

  async findOne(id: number): Promise<Maintenance> {
    const maintenance = await this.maintenanceRepository.findOne({
      where: { id },
      relations: ['vehicle'],
    });

    if (!maintenance) {
      throw new NotFoundException(`Maintenance with ID ${id} not found`);
    }

    return maintenance;
  }

  async update(
    id: number,
    updateMaintenanceDto: UpdateMaintenanceDto,
  ): Promise<Maintenance> {
    const maintenance = await this.findOne(id);
    Object.assign(maintenance, updateMaintenanceDto);
    return this.maintenanceRepository.save(maintenance);
  }

  async remove(id: number): Promise<void> {
    const maintenance = await this.findOne(id);
    await this.maintenanceRepository.remove(maintenance);
  }

  async findByVehicle(vehicleId: number): Promise<Maintenance[]> {
    return this.maintenanceRepository.find({
      where: { vehicleId },
      relations: ['vehicle'],
    });
  }

  async findByType(type: string): Promise<Maintenance[]> {
    return this.maintenanceRepository.find({
      where: { type },
      relations: ['vehicle'],
    });
  }

  async findPendingMaintenances(): Promise<Maintenance[]> {
    return this.maintenanceRepository.find({
      where: { isCompleted: false },
      relations: ['vehicle'],
    });
  }
}
