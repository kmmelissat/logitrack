# Testing Routes and Route Points

This guide will help you test the scheduled routes and route points functionality in the LogiTrack API.

## Prerequisites

1. **Start the development server**:

   ```bash
   npm run start:dev
   ```

2. **Seed the database with test data**:

   ```bash
   npm run seed
   ```

3. **Install a REST client** (Postman, Insomnia, or use curl)

## API Base URL

```
http://localhost:3000
```

## Authentication

All endpoints require JWT authentication. You'll need to:

1. Register a user or use existing test users
2. Login to get a JWT token
3. Include the token in the Authorization header: `Bearer <your-token>`

## Test Data Setup

### 1. Check Available Users and Vehicles

```bash
# Get all users
curl -X GET http://localhost:3000/users \
  -H "Authorization: Bearer <your-token>"

# Get all vehicles
curl -X GET http://localhost:3000/vehicles \
  -H "Authorization: Bearer <your-token>"

# Get available vehicles with assigned drivers
curl -X GET http://localhost:3000/scheduled-routes/available-vehicles \
  -H "Authorization: Bearer <your-token>"

# Get available drivers with assigned vehicles
curl -X GET http://localhost:3000/scheduled-routes/available-drivers \
  -H "Authorization: Bearer <your-token>"
```

## Testing Scheduled Routes

### 1. Create a New Route

```bash
curl -X POST http://localhost:3000/scheduled-routes \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer <your-token>" \
  -d '{
    "name": "Ruta San Salvador - Tegucigalpa",
    "description": "Ruta comercial diaria entre capitales",
    "plannedStartDate": "2025-01-20T06:00:00.000Z",
    "plannedEndDate": "2025-01-20T18:00:00.000Z",
    "origin": "Terminal San Salvador",
    "destination": "Terminal Tegucigalpa",
    "estimatedDistance": 250.5,
    "estimatedCost": 1500.00,
    "notes": "Carga frágil - manejo especial",
    "vehicleId": "<vehicle-id-from-available-vehicles>",
    "driverId": "<driver-id-from-available-drivers>"
  }'
```

### 2. List All Routes

```bash
curl -X GET "http://localhost:3000/scheduled-routes?page=1&limit=10" \
  -H "Authorization: Bearer <your-token>"
```

### 3. Get Route Details

```bash
curl -X GET http://localhost:3000/scheduled-routes/<route-id> \
  -H "Authorization: Bearer <your-token>"
```

### 4. Update a Route

```bash
curl -X PATCH http://localhost:3000/scheduled-routes/<route-id> \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer <your-token>" \
  -d '{
    "status": "en_progreso",
    "notes": "Ruta iniciada según lo planificado"
  }'
```

### 5. Calculate Route (Google Maps Integration)

```bash
curl -X POST http://localhost:3000/scheduled-routes/<route-id>/calculate \
  -H "Authorization: Bearer <your-token>"
```

## Testing Route Points

### 1. Create Route Points

```bash
# Create origin point
curl -X POST http://localhost:3000/route-points \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer <your-token>" \
  -d '{
    "name": "Terminal San Salvador",
    "description": "Punto de origen",
    "type": "origen",
    "latitude": 13.6929,
    "longitude": -89.2182,
    "address": "Terminal de Buses San Salvador",
    "sequenceOrder": 1,
    "plannedArrivalTime": "2025-01-20T06:00:00.000Z",
    "plannedDepartureTime": "2025-01-20T06:30:00.000Z",
    "estimatedStayMinutes": 30,
    "scheduledRouteId": "<route-id>"
  }'

# Create checkpoint
curl -X POST http://localhost:3000/route-points \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer <your-token>" \
  -d '{
    "name": "Checkpoint Santa Ana",
    "description": "Punto de control intermedio",
    "type": "checkpoint",
    "latitude": 13.9941,
    "longitude": -89.5598,
    "address": "Santa Ana, El Salvador",
    "sequenceOrder": 2,
    "plannedArrivalTime": "2025-01-20T08:00:00.000Z",
    "plannedDepartureTime": "2025-01-20T08:15:00.000Z",
    "estimatedStayMinutes": 15,
    "radiusMeters": 100,
    "scheduledRouteId": "<route-id>"
  }'

# Create destination point
curl -X POST http://localhost:3000/route-points \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer <your-token>" \
  -d '{
    "name": "Terminal Tegucigalpa",
    "description": "Punto de destino",
    "type": "destino",
    "latitude": 14.0723,
    "longitude": -87.1921,
    "address": "Terminal de Buses Tegucigalpa",
    "sequenceOrder": 3,
    "plannedArrivalTime": "2025-01-20T17:30:00.000Z",
    "plannedDepartureTime": "2025-01-20T18:00:00.000Z",
    "estimatedStayMinutes": 30,
    "scheduledRouteId": "<route-id>"
  }'
```

### 2. List Route Points

```bash
# Get all points for a specific route
curl -X GET http://localhost:3000/route-points?routeId=<route-id> \
  -H "Authorization: Bearer <your-token>"
```

### 3. Update Route Point

```bash
curl -X PATCH http://localhost:3000/route-points/<point-id> \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer <your-token>" \
  -d '{
    "actualArrivalTime": "2025-01-20T08:05:00.000Z",
    "actualDepartureTime": "2025-01-20T08:20:00.000Z",
    "isCompleted": true,
    "notes": "Llegada 5 minutos tarde, salida 5 minutos tarde"
  }'
```

## Testing Scenarios

### Scenario 1: Complete Route Lifecycle

1. Create a route with vehicle and driver
2. Add route points (origin, checkpoints, destination)
3. Start the route (update status to "en_progreso")
4. Update route points as you reach them
5. Complete the route (update status to "completada")

### Scenario 2: Route Validation

1. Try to create a route with a vehicle that has no assigned driver
2. Try to create a route with a driver that's not assigned to the vehicle
3. Try to create overlapping routes for the same vehicle/driver
4. Try to update a route with invalid vehicle-driver combinations

### Scenario 3: Route Points Management

1. Create route points in wrong sequence order
2. Update arrival/departure times
3. Mark points as completed
4. Add notes and observations

## Expected Responses

### Successful Route Creation

```json
{
  "_id": "507f1f77bcf86cd799439011",
  "name": "Ruta San Salvador - Tegucigalpa",
  "description": "Ruta comercial diaria entre capitales",
  "plannedStartDate": "2025-01-20T06:00:00.000Z",
  "plannedEndDate": "2025-01-20T18:00:00.000Z",
  "status": "planificada",
  "vehicle": {
    "_id": "507f1f77bcf86cd799439012",
    "plateNumber": "ABC123",
    "brand": "Toyota",
    "model": "Hilux",
    "status": "activo"
  },
  "driver": {
    "_id": "507f1f77bcf86cd799439013",
    "firstName": "Juan",
    "lastName": "Pérez",
    "email": "juan.perez@example.com",
    "role": "conductor"
  }
}
```

### Validation Error Example

```json
{
  "statusCode": 400,
  "message": "El vehículo no tiene un conductor asignado",
  "error": "Bad Request"
}
```

## Troubleshooting

### Common Issues:

1. **Authentication Error**: Make sure you're using a valid JWT token
2. **Vehicle-Driver Mismatch**: Ensure the vehicle has the driver assigned
3. **Schedule Conflicts**: Check for overlapping routes
4. **Invalid Dates**: Ensure start date is before end date and not in the past

### Debug Commands:

```bash
# Check database connection
npm run test:data

# Check available vehicles and drivers
curl -X GET http://localhost:3000/scheduled-routes/available-vehicles \
  -H "Authorization: Bearer <your-token>"

# Check route conflicts
curl -X GET "http://localhost:3000/scheduled-routes?status=planificada" \
  -H "Authorization: Bearer <your-token>"
```

## Next Steps

1. Test the Google Maps integration for route calculation
2. Test real-time GPS tracking integration
3. Test maintenance scheduling integration
4. Test reporting and analytics features
