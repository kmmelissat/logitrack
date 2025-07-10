import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  // Swagger config
  const config = new DocumentBuilder()
    .setTitle('Logitrack API')
    .setDescription('API para gestión de vehículos, rutas y más')
    .setVersion('1.0')
    .addBearerAuth() // Si usas JWT
    .build();
  const document = SwaggerModule.createDocument(app, config);
  SwaggerModule.setup('api', app, document); // <-- Esto habilita /api

  await app.listen(3000);
}
bootstrap();
