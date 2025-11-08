import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { AuthModule } from './auth/auth.module';
import { PlansModule } from './plans/plans.module';
import { UsersModule } from './users/users.module';
import { ContactsModule } from './contacts/contacts.module';
import { LabelsModule } from './labels/labels.module';
import { PublicsModule } from './publics/publics.module';
import { CampaignsModule } from './campaigns/campaigns.module';
import { QueueModule } from './queue/queue.module';
import { WhatsappModule } from './whatsapp/whatsapp.module';
import { ScheduleModule } from './schedule/schedule.module';
import { PaymentsModule } from './payments/payments.module';

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
        // Fix bigint returning as string
        supportBigNumbers: true,
        bigNumberStrings: false, // Return bigint as number (safe for IDs < 2^53)
      }),
    }),

    AuthModule,
    PlansModule,
    UsersModule,
    ContactsModule,
    LabelsModule,
    PublicsModule,
    CampaignsModule,
    QueueModule, // Redis + Bull Queue for async jobs
    WhatsappModule, // WhatsApp integration via WAHA API (15 endpoints)
    ScheduleModule, // Cron jobs for scheduled campaigns
    PaymentsModule, // Stripe payments (4 endpoints)
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
