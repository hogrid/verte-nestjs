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
import { FilesModule } from './files/files.module';
import { TemplatesModule } from './templates/templates.module';
import { ExportModule } from './export/export.module';
import { AdminModule } from './admin/admin.module';
import { UtilitiesModule } from './utilities/utilities.module';
import { NumbersModule } from './numbers/numbers.module';
import { DashboardModule } from './dashboard/dashboard.module';
import { UserProfileModule } from './user-profile/user-profile.module';
import { ExtractorModule } from './extractor/extractor.module';
import { RemainingModule } from './remaining/remaining.module';
import { TestDbSetupService } from './testing/test-db-setup.service';

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
        logging:
          configService.get('NODE_ENV') === 'development'
            ? true
            : configService.get('NODE_ENV') === 'test'
              ? ['error', 'warn', 'query']
              : false,
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
    FilesModule, // File upload/download (3 endpoints)
    TemplatesModule, // Message templates with variables (4 endpoints)
    ExportModule, // Export contacts/reports to CSV (2 endpoints)
    AdminModule, // Admin endpoints (11 endpoints - requires administrator profile)
    UtilitiesModule, // Utilities: health, recovery, debug, sync (19 endpoints)
    NumbersModule, // WhatsApp numbers CRUD (6 endpoints)
    DashboardModule, // User dashboard (2 endpoints)
    UserProfileModule, // User profile endpoints (2 endpoints)
    ExtractorModule, // Extractor config & Logs (3 endpoints)
    RemainingModule, // Final endpoints: integrations, webhooks, CORS, tests (18 endpoints)
  ],
  controllers: [AppController],
  providers: [AppService, TestDbSetupService],
})
export class AppModule {}
