import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { AuthModule } from './auth/auth.module';

@Module({
  imports: [
    // Configuration Module
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: '.env',
    }),

    // TypeORM Module - Uses SAME database as Laravel
    TypeOrmModule.forRootAsync({
      inject: [ConfigService],
      useFactory: (configService: ConfigService) => ({
        type: 'mysql',
        host: configService.get('DB_HOST', 'localhost'),
        port: configService.get<number>('DB_PORT', 5306),
        username: configService.get('DB_USERNAME', 'root'),
        password: configService.get('DB_PASSWORD', 'root'),
        database: configService.get('DB_DATABASE', 'verte_production'),
        entities: [__dirname + '/**/*.entity{.ts,.js}'],
        synchronize: false, // CRITICAL: Never sync - use existing Laravel tables
        charset: 'utf8mb4',
        timezone: '+00:00',
        logging: configService.get('NODE_ENV') === 'development',
      }),
    }),

    AuthModule,

    // TODO: Add modules here as migration progresses
    // AuthModule,
    // UsersModule,
    // CampaignsModule,
    // ContactsModule,
    // WhatsappModule,
    // PaymentsModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
