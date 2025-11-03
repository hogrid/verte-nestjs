import { NestFactory, Reflector } from '@nestjs/core';
import { ValidationPipe, ClassSerializerInterceptor } from '@nestjs/common';
import { useContainer } from 'class-validator';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { AppModule } from './app.module';
import { ValidationExceptionFilter } from './common/filters/validation-exception.filter';
import { BadRequestToValidationFilter } from './common/filters/bad-request-to-validation.filter';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  // Enable class-validator to use NestJS dependency injection
  useContainer(app.select(AppModule), { fallbackOnErrors: true });

  // Enable ClassSerializerInterceptor to apply @Exclude() decorators
  app.useGlobalInterceptors(new ClassSerializerInterceptor(app.get(Reflector)));

  // Enable CORS (compatible with Laravel configuration)
  app.enableCors({
    origin: true, // Allow all origins for development
    credentials: true,
    methods: 'GET,HEAD,PUT,PATCH,POST,DELETE,OPTIONS',
    allowedHeaders: 'Content-Type,Accept,Authorization',
  });

  // Global Exception Filters (Laravel-compatible validation errors)
  // BadRequestToValidationFilter converts 400 -> 422 for validation errors
  app.useGlobalFilters(
    new BadRequestToValidationFilter(),
    new ValidationExceptionFilter(),
  );

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

  // Swagger API Documentation
  const config = new DocumentBuilder()
    .setTitle('Verte API - NestJS')
    .setDescription(
      'API de automação de marketing via WhatsApp\n\n' +
        '**Migração Laravel → NestJS**\n' +
        '- 100% de compatibilidade com Laravel 8\n' +
        '- Mesma estrutura de responses\n' +
        '- Validações em português\n' +
        '- Banco de dados compartilhado\n\n' +
        '**Progresso**: 5% (6/121 endpoints)\n' +
        '**Módulos completos**: Auth (6 endpoints)',
    )
    .setVersion('1.0.0')
    .setContact(
      'Equipe Verte',
      'https://github.com/hogrid/verte-nestjs',
      'contato@verte.com',
    )
    .addTag('Auth', 'Autenticação e gerenciamento de sessão')
    .addTag('Plans', 'Gerenciamento de planos de assinatura')
    .addTag('Users', 'Gerenciamento de usuários (Pendente)')
    .addTag('Campaigns', 'Campanhas de marketing (Pendente)')
    .addTag('Contacts', 'Gerenciamento de contatos (Pendente)')
    .addTag('WhatsApp', 'Integração WAHA (Pendente)')
    .addTag('Payments', 'Pagamentos Stripe/MercadoPago (Pendente)')
    .addBearerAuth(
      {
        type: 'http',
        scheme: 'bearer',
        bearerFormat: 'JWT',
        name: 'JWT',
        description: 'Token JWT obtido via /api/v1/login',
        in: 'header',
      },
      'JWT-auth',
    )
    .addServer('http://localhost:3000', 'Desenvolvimento Local')
    .addServer('https://api.verte.com.br', 'Produção')
    .build();

  const document = SwaggerModule.createDocument(app, config);
  SwaggerModule.setup('api/docs', app, document, {
    customSiteTitle: 'Verte API Docs',
    customCss: '.swagger-ui .topbar { display: none }',
    swaggerOptions: {
      persistAuthorization: true,
      docExpansion: 'none',
      filter: true,
      showRequestDuration: true,
      tryItOutEnabled: true,
    },
  });

  // Listen on port
  const port = process.env.PORT ?? 3000;
  await app.listen(port);

  console.log(`🚀 Verte NestJS API running on: http://localhost:${port}`);
  console.log(`📚 API Documentation: http://localhost:${port}/api/docs`);
  console.log(`📊 Migration from Laravel 8 - Compatibility 100% required`);
}

bootstrap();
