import { NestFactory } from '@nestjs/core';
import { ValidationPipe, Logger } from '@nestjs/common';
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger';
import { ConfigService } from '@nestjs/config';
import { AppModule } from './app.module';

async function bootstrap() {
  const logger = new Logger('Bootstrap');
  const app = await NestFactory.create(AppModule);

  const configService = app.get(ConfigService);
  const port = configService.get<number>('PORT', 3001);
  const apiPrefix = configService.get<string>('API_PREFIX', 'api/v1');
  const frontendUrl = configService.get<string>('FRONTEND_URL', 'http://localhost:3000');

  // Global prefix
  app.setGlobalPrefix(apiPrefix);

  // CORS configuration
  app.enableCors({
    origin: [frontendUrl, 'http://localhost:3000', 'http://localhost:3001'],
    credentials: true,
  });

  // Global validation pipe
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      transform: true,
      forbidNonWhitelisted: true,
    }),
  );

  // Swagger OpenAPI Documentation
  const swaggerConfig = new DocumentBuilder()
    .setTitle('MSU Lalan API')
    .setDescription('Campus Geospatial Navigation and Directory System API for Mindanao State University Main Campus')
    .setVersion('1.0.0 (Sprint 0)')
    .addBearerAuth()
    .build();

  const document = SwaggerModule.createDocument(app, swaggerConfig);
  SwaggerModule.setup('docs', app, document);

  await app.listen(port);
  logger.log(`🚀 MSU Lalan API running on: http://localhost:${port}/${apiPrefix}`);
  logger.log(`📚 Swagger API Docs available at: http://localhost:${port}/docs`);
}

bootstrap();
