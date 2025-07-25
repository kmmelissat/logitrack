import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import {
  ScheduledRoute,
  ScheduledRouteDocument,
} from './entities/scheduled-route.entity';
import {
  RoutePoint,
  RoutePointDocument,
} from '../route-point/entities/route-point.entity';
import { Vehicle, VehicleDocument } from '../vehicle/entities/vehicle.entity';
import { User, UserDocument } from '../users/entities/user.entity';
import { UpdateScheduledRouteDto } from './dto/update-scheduled-route.dto';
import { CreateScheduledRouteDto } from './dto/create-scheduled-route.dto';
import {
  ListScheduledRoutesDto,
  ListScheduledRoutesResponseDto,
} from './dto/list-scheduled-route.dto';
import { RouteStatus } from './entities/scheduled-route.entity';
import { MapsService } from '../maps/maps.service';
import { VehicleStatus } from '../vehicle/enums/vehicle-status.enum';
import { Role } from '../auth/enums/role.enum';

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
    private mapsService: MapsService,
  ) {}

  async findAll(
    queryDto: ListScheduledRoutesDto,
  ): Promise<ListScheduledRoutesResponseDto> {
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
          { destination: { $regex: search, $options: 'i' } },
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
        this.scheduledRouteModel.countDocuments(filter),
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
          hasPrev,
        },
      };
    } catch (error) {
      throw new BadRequestException(`Error al obtener rutas: ${error.message}`);
    }
  }

  async create(createDto: CreateScheduledRouteDto): Promise<ScheduledRoute> {
    try {
      // Validar que el conductor existe y es un conductor
      const driver = await this.userModel.findById(createDto.driverId);
      if (!driver) {
        throw new NotFoundException('Conductor no encontrado');
      }

      if (driver.role !== Role.CONDUCTOR) {
        throw new BadRequestException(
          'El usuario seleccionado no es un conductor',
        );
      }

      // Validar que el vehículo existe, está activo y tiene el conductor asignado
      const vehicle = await this.validateVehicleDriverAssignment(
        createDto.vehicleId,
        createDto.driverId,
      );

      // Validar fechas
      const startDate = new Date(createDto.plannedStartDate);
      const endDate = new Date(createDto.plannedEndDate);

      if (startDate >= endDate) {
        throw new BadRequestException(
          'La fecha de inicio debe ser anterior a la fecha de fin',
        );
      }

      if (startDate < new Date()) {
        throw new BadRequestException(
          'La fecha de inicio no puede ser en el pasado',
        );
      }

      // Verificar conflictos de programación
      const conflictingRoute = await this.scheduledRouteModel.findOne({
        status: { $in: ['planificada', 'en_progreso'] },
        $or: [
          {
            vehicleId: createDto.vehicleId,
            plannedStartDate: { $lte: endDate },
            plannedEndDate: { $gte: startDate },
          },
          {
            driverId: createDto.driverId,
            plannedStartDate: { $lte: endDate },
            plannedEndDate: { $gte: startDate },
          },
        ],
      });

      if (conflictingRoute) {
        throw new BadRequestException(
          'Existe un conflicto de programación con otra ruta',
        );
      }

      // Crear la nueva ruta
      const newRoute = new this.scheduledRouteModel({
        ...createDto,
        status: createDto.status || RouteStatus.PLANIFICADA,
      });

      const savedRoute = await newRoute.save();

      // Retornar con populate
      const populatedRoute = await this.scheduledRouteModel
        .findById(savedRoute._id)
        .populate('vehicleId', 'plateNumber brand model status')
        .populate('driverId', 'firstName lastName email role')
        .lean();

      if (!populatedRoute) {
        throw new NotFoundException(
          'No se pudo encontrar la ruta recién creada',
        );
      }

      return populatedRoute as ScheduledRoute;
    } catch (error) {
      if (
        error instanceof NotFoundException ||
        error instanceof BadRequestException
      ) {
        throw error;
      }
      throw new BadRequestException(`Error al crear la ruta: ${error.message}`);
    }
  }

  /**
   * Validates that a vehicle has an assigned driver and the driver matches the provided driver ID
   * @param vehicleId - The vehicle ID to validate
   * @param driverId - The driver ID to check against
   * @returns The vehicle document if validation passes
   * @throws BadRequestException if validation fails
   */
  private async validateVehicleDriverAssignment(
    vehicleId: Types.ObjectId,
    driverId: Types.ObjectId,
  ): Promise<VehicleDocument> {
    const vehicle = await this.vehicleModel.findById(vehicleId);
    if (!vehicle) {
      throw new NotFoundException('Vehículo no encontrado');
    }

    if (vehicle.status !== VehicleStatus.ACTIVO) {
      throw new BadRequestException(
        'El vehículo no está disponible para asignación',
      );
    }

    if (!vehicle.assignedDriverId) {
      throw new BadRequestException(
        'El vehículo no tiene un conductor asignado',
      );
    }

    if (vehicle.assignedDriverId.toString() !== driverId.toString()) {
      throw new BadRequestException(
        'El conductor seleccionado no está asignado a este vehículo',
      );
    }

    return vehicle;
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
        throw new BadRequestException(
          'No se puede eliminar una ruta en progreso',
        );
      }

      if (route.status === 'completada') {
        throw new BadRequestException(
          'No se puede eliminar una ruta completada',
        );
      }

      // Eliminar puntos de ruta relacionados
      await this.routePointModel.deleteMany({
        scheduledRouteId: new Types.ObjectId(id),
      });

      // Eliminar la ruta
      await this.scheduledRouteModel.findByIdAndDelete(id);

      return {
        message: 'Ruta eliminada exitosamente',
      };
    } catch (error) {
      if (
        error instanceof NotFoundException ||
        error instanceof BadRequestException
      ) {
        throw error;
      }
      throw new BadRequestException(
        `Error al eliminar la ruta: ${error.message}`,
      );
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
      .populate(
        'vehicleId',
        'plateNumber brand model year vin status mileage fuelType capacity',
      )
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
  async update(
    id: string,
    updateScheduledRouteDto: UpdateScheduledRouteDto,
  ): Promise<ScheduledRouteDocument> {
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
    if (
      updateScheduledRouteDto.plannedStartDate &&
      updateScheduledRouteDto.plannedEndDate
    ) {
      if (
        new Date(updateScheduledRouteDto.plannedStartDate) >=
        new Date(updateScheduledRouteDto.plannedEndDate)
      ) {
        throw new BadRequestException(
          'La fecha de inicio debe ser anterior a la fecha de fin',
        );
      }
    }

    // Validar vehicle-driver assignment si se está actualizando el vehículo o conductor
    if (updateScheduledRouteDto.vehicleId || updateScheduledRouteDto.driverId) {
      const vehicleId =
        updateScheduledRouteDto.vehicleId || existingRoute.vehicleId;
      const driverId =
        updateScheduledRouteDto.driverId || existingRoute.driverId;

      // Validar que el conductor existe y es un conductor
      const driver = await this.userModel.findById(driverId);
      if (!driver) {
        throw new NotFoundException('Conductor no encontrado');
      }

      if (driver.role !== Role.CONDUCTOR) {
        throw new BadRequestException(
          'El usuario seleccionado no es un conductor',
        );
      }

      // Validar que el vehículo existe, está activo y tiene el conductor asignado
      await this.validateVehicleDriverAssignment(vehicleId, driverId);

      // Verificar conflictos de programación si se está cambiando el vehículo o conductor
      if (
        updateScheduledRouteDto.vehicleId ||
        updateScheduledRouteDto.driverId
      ) {
        const startDate =
          updateScheduledRouteDto.plannedStartDate ||
          existingRoute.plannedStartDate;
        const endDate =
          updateScheduledRouteDto.plannedEndDate ||
          existingRoute.plannedEndDate;

        const conflictingRoute = await this.scheduledRouteModel.findOne({
          _id: { $ne: new Types.ObjectId(id) }, // Exclude current route
          status: { $in: ['planificada', 'en_progreso'] },
          $or: [
            {
              vehicleId: vehicleId,
              plannedStartDate: { $lte: endDate },
              plannedEndDate: { $gte: startDate },
            },
            {
              driverId: driverId,
              plannedStartDate: { $lte: endDate },
              plannedEndDate: { $gte: startDate },
            },
          ],
        });

        if (conflictingRoute) {
          throw new BadRequestException(
            'Existe un conflicto de programación con otra ruta',
          );
        }
      }
    }

    // Actualizar solo los campos enviados
    const updatedRoute = await this.scheduledRouteModel
      .findByIdAndUpdate(
        id,
        { $set: updateScheduledRouteDto },
        {
          new: true, // Retornar el documento actualizado
          runValidators: true, // Ejecutar validaciones del schema
        },
      )
      .populate(
        'vehicleId',
        'plateNumber brand model year vin status mileage fuelType capacity',
      )
      .populate('driverId', 'email firstName lastName picture role')
      .exec();

    if (!updatedRoute) {
      throw new NotFoundException(`Error actualizando ruta con ID ${id}`);
    }

    return updatedRoute;
  }

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

    // Formatear respuesta limpia como el ejemplo esperado
    const cleanResponse = {
      _id: routeObj._id,
      name: routeObj.name,
      description: routeObj.description,
      plannedStartDate: routeObj.plannedStartDate,
      plannedEndDate: routeObj.plannedEndDate,
      actualStartTime: routeObj.actualStartTime,
      actualEndTime: routeObj.actualEndTime,
      status: routeObj.status,
      estimatedDistance: routeObj.estimatedDistance,
      actualDistance: routeObj.actualDistance,
      origin: routeObj.origin,
      destination: routeObj.destination,
      estimatedCost: routeObj.estimatedCost,
      notes: routeObj.notes,
      vehicle: routeObj.vehicleId,
      driver: routeObj.driverId,
      points: routeObj.points || [],
      // Google Maps route data
      routePolyline: routeObj.routePolyline,
      decodedPath: routeObj.decodedPath,
      estimatedDuration: routeObj.estimatedDuration,
      estimatedDurationText: routeObj.estimatedDurationText,
      estimatedDistanceText: routeObj.estimatedDistanceText,
      routeSteps: routeObj.routeSteps,
      waypoints: routeObj.waypoints,
      lastRouteCalculation: routeObj.lastRouteCalculation,
      createdAt: routeObj.createdAt,
      updatedAt: routeObj.updatedAt,
    };

    // Remover campos undefined para respuesta más limpia
    Object.keys(cleanResponse).forEach((key) => {
      if (cleanResponse[key] === undefined) {
        delete cleanResponse[key];
      }
    });
    return cleanResponse;
  }

  async calculateAndUpdateRoute(id: string): Promise<ScheduledRoute> {
    try {
      // Get the route with all its points
      const route = await this.findOneWithDetails(id);
      const routePoints = await this.routePointModel
        .find({ scheduledRouteId: id })
        .sort({ sequenceOrder: 1 })
        .exec();

      if (routePoints.length < 2) {
        throw new BadRequestException(
          'Route must have at least origin and destination points',
        );
      }

      // Calculate route using Google Maps
      const routeData = await this.mapsService.calculateRouteFromPoints(
        routePoints.map((point) => ({
          latitude: point.latitude,
          longitude: point.longitude,
          type: point.type,
        })),
      );

      // Update the route with Google Maps data
      const updatedRoute = await this.scheduledRouteModel
        .findByIdAndUpdate(
          id,
          {
            routePolyline: routeData.routePolyline,
            decodedPath: routeData.decodedPath,
            estimatedDistance: routeData.estimatedDistance,
            estimatedDistanceText: routeData.estimatedDistanceText,
            estimatedDuration: routeData.estimatedDuration,
            estimatedDurationText: routeData.estimatedDurationText,
            routeSteps: routeData.routeSteps,
            waypoints: routeData.waypoints,
            lastRouteCalculation: new Date(),
          },
          { new: true },
        )
        .populate('vehicleId', 'plateNumber brand model status')
        .populate('driverId', 'firstName lastName email')
        .exec();

      if (!updatedRoute) {
        throw new NotFoundException(`Route with ID ${id} not found`);
      }

      return updatedRoute;
    } catch (error) {
      if (
        error instanceof BadRequestException ||
        error instanceof NotFoundException
      ) {
        throw error;
      }
      throw new BadRequestException(
        `Error calculating route: ${error.message}`,
      );
    }
  }

  async getRouteWithCompletePath(id: string): Promise<any> {
    const route = await this.findOneWithDetails(id);

    // If route doesn't have Google Maps data, calculate it
    if (!route.routePolyline || !route.decodedPath) {
      await this.calculateAndUpdateRoute(id);
      return this.findOneWithDetails(id);
    }

    return route;
  }

  /**
   * Gets all vehicles that are available for route assignment (active with assigned drivers)
   * Optionally filters by date range to check for scheduling conflicts
   * @param startDate - Optional start date to check availability
   * @param endDate - Optional end date to check availability
   * @returns Array of vehicles with their assigned drivers
   */
  async getAvailableVehiclesWithDrivers(
    startDate?: Date,
    endDate?: Date,
  ): Promise<VehicleDocument[]> {
    // Get all active vehicles with assigned drivers
    const vehicles = await this.vehicleModel
      .find({
        status: VehicleStatus.ACTIVO,
        assignedDriverId: { $exists: true, $ne: null },
      })
      .populate('assignedDriverId', 'firstName lastName email role')
      .exec();

    // If no date range provided, return all vehicles
    if (!startDate || !endDate) {
      return vehicles;
    }

    // Filter out vehicles that have conflicting routes
    const availableVehicles: VehicleDocument[] = [];

    for (const vehicle of vehicles) {
      // Check for existing routes that overlap with the requested time
      const conflictingRoutes = await this.scheduledRouteModel.find({
        vehicleId: vehicle._id,
        $or: [
          // Route starts during the requested period
          {
            plannedStartDate: { $gte: startDate, $lt: endDate },
          },
          // Route ends during the requested period
          {
            plannedEndDate: { $gt: startDate, $lte: endDate },
          },
          // Route completely encompasses the requested period
          {
            plannedStartDate: { $lte: startDate },
            plannedEndDate: { $gte: endDate },
          },
        ],
        // Exclude completed and cancelled routes
        status: { $nin: ['completada', 'cancelada'] },
      });

      // If no conflicts, vehicle is available
      if (conflictingRoutes.length === 0) {
        availableVehicles.push(vehicle);
      }
    }

    return availableVehicles;
  }

  /**
   * Gets all drivers that are available for route assignment (have assigned vehicles)
   * Optionally filters by date range to check for scheduling conflicts
   * @param startDate - Optional start date to check availability
   * @param endDate - Optional end date to check availability
   * @returns Array of drivers with their assigned vehicles
   */
  async getAvailableDriversWithVehicles(
    startDate?: Date,
    endDate?: Date,
  ): Promise<UserDocument[]> {
    // Get all active vehicles with assigned drivers (without populate to avoid type issues)
    const vehiclesWithDrivers = await this.vehicleModel
      .find({
        status: VehicleStatus.ACTIVO,
        assignedDriverId: { $exists: true, $ne: null },
      })
      .exec();

    const driverIds = vehiclesWithDrivers
      .map((v) => v.assignedDriverId)
      .filter((id): id is Types.ObjectId => id !== null && id !== undefined);

    // If no date range provided, return all drivers
    if (!startDate || !endDate) {
      return this.userModel
        .find({
          _id: { $in: driverIds },
          role: Role.CONDUCTOR,
        })
        .exec();
    }

    // Filter out drivers that have conflicting routes
    const availableDriverIds: Types.ObjectId[] = [];

    for (const driverId of driverIds) {
      // Check for existing routes that overlap with the requested time
      const conflictingRoutes = await this.scheduledRouteModel.find({
        driverId: driverId,
        $or: [
          // Route starts during the requested period
          {
            plannedStartDate: { $gte: startDate, $lt: endDate },
          },
          // Route ends during the requested period
          {
            plannedEndDate: { $gt: startDate, $lte: endDate },
          },
          // Route completely encompasses the requested period
          {
            plannedStartDate: { $lte: startDate },
            plannedEndDate: { $gte: endDate },
          },
        ],
        // Exclude completed and cancelled routes
        status: { $nin: ['completada', 'cancelada'] },
      });

      // If no conflicts, driver is available
      if (conflictingRoutes.length === 0) {
        availableDriverIds.push(driverId);
      }
    }

    return this.userModel
      .find({
        _id: { $in: availableDriverIds },
        role: Role.CONDUCTOR,
      })
      .exec();
  }
}
