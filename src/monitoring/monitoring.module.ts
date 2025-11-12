import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ErrorTrackingService } from './error-tracking.service';
import { Campaign } from '../database/entities/campaign.entity';
import { PublicByContact } from '../database/entities/public-by-contact.entity';

/**
 * MonitoringModule
 *
 * Módulo para monitoramento e tracking de erros do sistema
 * Inclui Circuit Breaker e estatísticas de falhas
 */
@Module({
  imports: [TypeOrmModule.forFeature([Campaign, PublicByContact])],
  providers: [ErrorTrackingService],
  exports: [ErrorTrackingService],
})
export class MonitoringModule {}
