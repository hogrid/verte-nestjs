import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import { useContainer } from 'class-validator';
import { AppModule } from './app.module';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  // Enable class-validator to use NestJS dependency injection
  useContainer(app.select(AppModule), { fallbackOnErrors: true });

  // Enable CORS (compatible with Laravel configuration)
  app.enableCors({
    origin: true, // Allow all origins for development
    credentials: true,
    methods: 'GET,HEAD,PUT,PATCH,POST,DELETE,OPTIONS',
    allowedHeaders: 'Content-Type,Accept,Authorization',
  });

  // Global Validation Pipe (for DTO validation)
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: false,
      transform: true,
      transformOptions: {
        enableImplicitConversion: true,
      },
    }),
  );

  // Listen on port
  const port = process.env.PORT ?? 3000;
  await app.listen(port);

  console.log(`🚀 Verte NestJS API running on: http://localhost:${port}`);
  console.log(`📚 Migration from Laravel 8 - Compatibility 100% required`);
}

bootstrap();
