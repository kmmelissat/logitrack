import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { AppModule } from './app.module';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  // Global validation pipe
  app.useGlobalPipes(
    new ValidationPipe({
      transform: true,
      whitelist: true,
      forbidNonWhitelisted: true,
    }),
  );

  // Swagger configuration
  const config = new DocumentBuilder()
    .setTitle('LogiTrack API')
    .setDescription(
      'API para el sistema de gestión logística LogiTrack - Centraliza rutas, monitoreo GPS, check-ins de conductores y mantenimiento de vehículos',
    )
    .setVersion('1.0')
    .addTag('system', 'Sistema y health check')
    .addTag('auth', 'Autenticación y autorización')
    .addTag('users', 'Gestión de usuarios')
    .addTag('vehicles', 'Gestión de vehículos')
    .addTag('maintenance', 'Mantenimiento de vehículos')
    .addTag('scheduled-routes', 'Rutas programadas')
    .addTag('route-points', 'Puntos de ruta')
    .addTag('vehicle-checkins', 'Check-ins de vehículos')
    .addTag('gps-events', 'Eventos GPS')
    .addBearerAuth()
    .build();

  const document = SwaggerModule.createDocument(app, config);
  SwaggerModule.setup('api', app, document, {
    swaggerOptions: {
      persistAuthorization: true,
    },
  });

  await app.listen(process.env.PORT ?? 3000);

  console.log('🚛 LogiTrack API iniciada');
  console.log('🔑 Google Maps API Key:', process.env.GOOGLE_MAPS_API_KEY);
  console.log('🏠 Port:', process.env.PORT ?? 3000);
  const url = `http://localhost:${process.env.PORT ?? 3000}`;
  console.log(`📖 Documentación Swagger: ${url}/api`);
  console.log(`🔗 URL: ${url}`);
}
bootstrap();
