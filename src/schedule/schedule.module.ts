import { Module } from '@nestjs/common';
import { ScheduleModule as NestScheduleModule } from '@nestjs/schedule';
import { TypeOrmModule } from '@nestjs/typeorm';
import { BullModule } from '@nestjs/bull';
import { ScheduleService } from './schedule.service';
import { Campaign } from '../database/entities/campaign.entity';
import { QUEUE_NAMES } from '../config/redis.config';

/**
 * ScheduleModule
 *
 * Módulo para gerenciar tarefas agendadas (cron jobs).
 *
 * Jobs ativos:
 * - dispatch-scheduled-campaigns: A cada minuto, verifica e dispara campanhas agendadas
 *
 * Configuração:
 * - Timezone: America/Sao_Paulo
 * - Previne execuções paralelas com lock
 *
 * Compatibilidade: Laravel Schedule (app/Console/Kernel.php)
 */
@Module({
  imports: [
    // NestJS Schedule para cron jobs
    NestScheduleModule.forRoot(),
    // TypeORM entities
    TypeOrmModule.forFeature([Campaign]),
    // Bull queue para dispatching
    BullModule.registerQueue({
      name: QUEUE_NAMES.CAMPAIGNS,
    }),
  ],
  providers: [ScheduleService],
  exports: [ScheduleService], // Export para uso manual em controllers
})
export class ScheduleModule {}
