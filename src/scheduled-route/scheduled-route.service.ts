import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { CreateScheduledRouteDto } from './dto/create-scheduled-route.dto';
import { ListScheduledRoutesDto, ListScheduledRoutesResponseDto } from './dto/list-scheduled-route.dto';

@Injectable()
export class ScheduledRouteService {

async findAll(queryDto: ListScheduledRoutesDto): Promise<ListScheduledRoutesResponseDto> {
  try {
    const { page, limit, status, search, sortBy, sortOrder } = queryDto;
    
    // Construir filtros
    const filter: any = {};
    
    if (status) {
      filter.status = status;
    }
    
    if (search) {
      filter.$or = [
        { name: { $regex: search, $options: 'i' } },
        { description: { $regex: search, $options: 'i' } },
        { origin: { $regex: search, $options: 'i' } },
        { destination: { $regex: search, $options: 'i' } }
      ];
    }

    
    const skip = (page - 1) * limit;
    
    
    const sort: any = {};
    sort[sortBy] = sortOrder === 'asc' ? 1 : -1;

    
    const [routes, total] = await Promise.all([
      this.scheduledRouteModel
        .find(filter)
        .populate('vehicleId', 'plateNumber brand model status')
        .populate('driverId', 'firstName lastName email')
        .sort(sort)
        .skip(skip)
        .limit(limit)
        .lean(),
      this.scheduledRouteModel.countDocuments(filter)
    ]);

    
    const totalPages = Math.ceil(total / limit);
    const hasNext = page < totalPages;
    const hasPrev = page > 1;

    return {
      data: routes,
      pagination: {
        page,
        limit,
        total,
        totalPages,
        hasNext,
        hasPrev
      }
    };
  } catch (error) {
    throw new BadRequestException(`Error al obtener rutas: ${error.message}`);
  }
}

async create(createDto: CreateScheduledRouteDto): Promise<ScheduledRoute> {
  try {
    // Validar que el vehículo existe y está disponible
    const vehicle = await this.vehicleModel.findById(createDto.vehicleId);
    if (!vehicle) {
      throw new NotFoundException('Vehículo no encontrado');
    }
    
    if (vehicle.status !== 'activo') {
      throw new BadRequestException('El vehículo no está disponible para asignación');
    }

    
    const driver = await this.userModel.findById(createDto.driverId);
    if (!driver) {
      throw new NotFoundException('Conductor no encontrado');
    }
    
    if (driver.role !== 'conductor') {
      throw new BadRequestException('El usuario seleccionado no es un conductor');
    }

    // Validar fechas
    const startDate = new Date(createDto.plannedStartDate);
    const endDate = new Date(createDto.plannedEndDate);
    
    if (startDate >= endDate) {
      throw new BadRequestException('La fecha de inicio debe ser anterior a la fecha de fin');
    }
    
    if (startDate < new Date()) {
      throw new BadRequestException('La fecha de inicio no puede ser en el pasado');
    }

    // Verificar conflictos de programación
    const conflictingRoute = await this.scheduledRouteModel.findOne({
      $or: [
        { vehicleId: createDto.vehicleId },
        { driverId: createDto.driverId }
      ],
      status: { $in: ['planificada', 'en_progreso'] },
      $or: [
        {
          plannedStartDate: { $lte: endDate },
          plannedEndDate: { $gte: startDate }
        }
      ]
    });

    if (conflictingRoute) {
      throw new BadRequestException('Existe un conflicto de programación con otra ruta');
    }

    // Crear la nueva ruta
    const newRoute = new this.scheduledRouteModel({
      ...createDto,
      status: createDto.status || RouteStatus.PLANIFICADA
    });

    const savedRoute = await newRoute.save();
    
    // Retornar con populate
    return await this.scheduledRouteModel
      .findById(savedRoute._id)
      .populate('vehicleId', 'plateNumber brand model status')
      .populate('driverId', 'firstName lastName email role')
      .lean();

  } catch (error) {
    if (error instanceof NotFoundException || error instanceof BadRequestException) {
      throw error;
    }
    throw new BadRequestException(`Error al crear la ruta: ${error.message}`);
  }
}

async remove(id: string): Promise<{ message: string }> {
  try {
    // Validar formato de ID
    if (!Types.ObjectId.isValid(id)) {
      throw new BadRequestException('ID de ruta inválido');
    }

    // Buscar la ruta
    const route = await this.scheduledRouteModel.findById(id);
    if (!route) {
      throw new NotFoundException('Ruta no encontrada');
    }

    // Validar que se puede eliminar
    if (route.status === 'en_progreso') {
      throw new BadRequestException('No se puede eliminar una ruta en progreso');
    }

    if (route.status === 'completada') {
      throw new BadRequestException('No se puede eliminar una ruta completada');
    }

    // Eliminar puntos de ruta relacionados
    await this.routePointModel.deleteMany({ scheduledRouteId: new Types.ObjectId(id) });

    // Eliminar la ruta
    await this.scheduledRouteModel.findByIdAndDelete(id);

    return {
      message: 'Ruta eliminada exitosamente'
    };

  } catch (error) {
    if (error instanceof NotFoundException || error instanceof BadRequestException) {
      throw error;
    }
    throw new BadRequestException(`Error al eliminar la ruta: ${error.message}`);
  }
}
}
