import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { ScheduledRoute, ScheduledRouteDocument } from './entities/scheduled-route.entity';
import { RoutePoint, RoutePointDocument } from '../route-point/entities/route-point.entity';
import { Vehicle, VehicleDocument } from '../vehicle/entities/vehicle.entity';
import { User, UserDocument } from '../users/entities/user.entity';
import { UpdateScheduledRouteDto } from './dto/update-scheduled-route.dto';
import { CreateScheduledRouteDto } from './dto/create-scheduled-route.dto';
import { ListScheduledRoutesDto, ListScheduledRoutesResponseDto } from './dto/list-scheduled-route.dto';
import { RouteStatus } from './entities/scheduled-route.entity';

@Injectable()
export class ScheduledRouteService {
  constructor(
    @InjectModel(ScheduledRoute.name)
    private scheduledRouteModel: Model<ScheduledRouteDocument>,
    @InjectModel(RoutePoint.name)
    private routePointModel: Model<RoutePointDocument>,
    @InjectModel(Vehicle.name)
    private vehicleModel: Model<VehicleDocument>,
    @InjectModel(User.name)
    private userModel: Model<UserDocument>,
  ) {}

  async findAll(queryDto: ListScheduledRoutesDto): Promise<ListScheduledRoutesResponseDto> {
  try {
    let { page, limit, status, search, sortBy, sortOrder } = queryDto;
    page = page ?? 1;
    limit = limit ?? 10;
    
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

    // Configurar paginación
    const skip = (page - 1) * limit;
    
    // Configurar ordenamiento
    const sort: any = {};
    if (sortBy) {
      sort[sortBy] = sortOrder === 'asc' ? 1 : -1;
    }

    // Ejecutar consulta con populate
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

    // Calcular información de paginación
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

    // Validar que el conductor existe
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
      status: { $in: ['planificada', 'en_progreso'] },
      $or: [
        {
          vehicleId: createDto.vehicleId,
          plannedStartDate: { $lte: endDate },
          plannedEndDate: { $gte: startDate }
        },
        {
          driverId: createDto.driverId,
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
    const populatedRoute = await this.scheduledRouteModel
      .findById(savedRoute._id)
      .populate('vehicleId', 'plateNumber brand model status')
      .populate('driverId', 'firstName lastName email role')
      .lean();

    if (!populatedRoute) {
      throw new NotFoundException('No se pudo encontrar la ruta recién creada');
    }

    return populatedRoute as ScheduledRoute;

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

  /**
   * Busca una ruta por ID con todos sus detalles relacionados
   * Incluye: vehículo, conductor y puntos de ruta ordenados
   */
  async findOneWithDetails(id: string): Promise<ScheduledRouteDocument> {
    // Validar que el ID sea válido
    if (!Types.ObjectId.isValid(id)) {
      throw new BadRequestException('ID de ruta inválido');
    }

    // Buscar la ruta con populate de vehículo y conductor (campos reales)
    const route = await this.scheduledRouteModel
      .findById(id)
      .populate('vehicleId', 'plateNumber brand model year vin status mileage fuelType capacity')
      .populate('driverId', 'email firstName lastName picture role')
      .exec();

    if (!route) {
      throw new NotFoundException(`Ruta con ID ${id} no encontrada`);
    }

    // Buscar todos los puntos de esta ruta ordenados por sequenceOrder
    const points = await this.routePointModel
      .find({ scheduledRouteId: new Types.ObjectId(id) })
      .sort({ sequenceOrder: 1 }) // Ordenar por sequence
      .exec();

    // Agregar los puntos al objeto de ruta
    // Nota: Esto es una forma de hacerlo, otra opción es usar populate virtual
    (route as any).points = points;

    return route;
  }

  /**
   * Actualiza una ruta programada
   * Solo actualiza los campos enviados en el DTO
   */
  async update(id: string, updateScheduledRouteDto: UpdateScheduledRouteDto): Promise<ScheduledRouteDocument> {
    // Validar que el ID sea válido
    if (!Types.ObjectId.isValid(id)) {
      throw new BadRequestException('ID de ruta inválido');
    }

    // Verificar que la ruta existe
    const existingRoute = await this.scheduledRouteModel.findById(id).exec();
    if (!existingRoute) {
      throw new NotFoundException(`Ruta con ID ${id} no encontrada`);
    }

    // Validaciones de negocio adicionales
    if (updateScheduledRouteDto.plannedStartDate && updateScheduledRouteDto.plannedEndDate) {
      if (new Date(updateScheduledRouteDto.plannedStartDate) >= new Date(updateScheduledRouteDto.plannedEndDate)) {
        throw new BadRequestException('La fecha de inicio debe ser anterior a la fecha de fin');
      }
    }

    // Actualizar solo los campos enviados
    const updatedRoute = await this.scheduledRouteModel
      .findByIdAndUpdate(
        id,
        { $set: updateScheduledRouteDto },
        { 
          new: true, // Retornar el documento actualizado
          runValidators: true // Ejecutar validaciones del schema
        }
      )
      .populate('vehicleId', 'plateNumber brand model year vin status mileage fuelType capacity')
      .populate('driverId', 'email firstName lastName picture role')
      .exec();

    if (!updatedRoute) {
      throw new NotFoundException(`Error actualizando ruta con ID ${id}`);
    }

    return updatedRoute;
  }

  /**
   * Método auxiliar para formatear la respuesta con puntos
   * Transforma el documento de MongoDB a un formato más limpio para la API
   */
  async formatRouteResponse(route: ScheduledRouteDocument): Promise<any> {
    const routeObj = route.toObject();
    
    // Buscar puntos si no están incluidos
    if (!routeObj.points) {
      const points = await this.routePointModel
        .find({ scheduledRouteId: route._id })
        .sort({ sequenceOrder: 1 })
        .exec();
      routeObj.points = points;
    }

    // Renombrar los campos populados para que coincidan con el DTO de respuesta
    return {
      ...routeObj,
      vehicle: routeObj.vehicleId,
      driver: routeObj.driverId,
      // Limpiar los campos originales que ya fueron renombrados
      vehicleId: undefined,
      driverId: undefined,
    };
  }
}
