import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { ScheduledRoute, ScheduledRouteDocument } from './entities/scheduled-route.entity';
import { RoutePoint, RoutePointDocument } from '../route-point/entities/route-point.entity';
import { Vehicle, VehicleDocument } from '../vehicle/entities/vehicle.entity';
import { User, UserDocument } from '../users/entities/user.entity';
import { UpdateScheduledRouteDto } from './dto/update-scheduled-route.dto';

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