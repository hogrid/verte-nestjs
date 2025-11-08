import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { InjectQueue } from '@nestjs/bull';
import type { Queue } from 'bull';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, LessThanOrEqual } from 'typeorm';
import { QUEUE_NAMES } from '../config/redis.config';
import { Campaign } from '../database/entities/campaign.entity';

/**
 * ScheduleService
 *
 * Gerencia tarefas agendadas (cron jobs) do sistema.
 *
 * Jobs implementados:
 * - dispatchScheduledCampaigns: Verifica e dispara campanhas agendadas (a cada minuto)
 *
 * Compatibilidade: Laravel Schedule (app/Console/Kernel.php)
 */
@Injectable()
export class ScheduleService {
  private readonly logger = new Logger(ScheduleService.name);
  private isProcessing = false; // Prevenir execuções paralelas

  constructor(
    @InjectRepository(Campaign)
    private readonly campaignRepository: Repository<Campaign>,
    @InjectQueue(QUEUE_NAMES.CAMPAIGNS)
    private readonly campaignsQueue: Queue,
  ) {}

  /**
   * Dispatch Scheduled Campaigns
   *
   * Executa a cada minuto para verificar campanhas agendadas
   * que estão prontas para serem disparadas.
   *
   * Laravel: app/Console/Kernel.php
   * Schedule::job(new CampaignsJob())->everyMinute();
   */
  @Cron(CronExpression.EVERY_MINUTE, {
    name: 'dispatch-scheduled-campaigns',
    timeZone: 'America/Sao_Paulo', // Timezone do Brasil
  })
  async dispatchScheduledCampaigns() {
    // Evitar execuções paralelas (caso job anterior ainda esteja rodando)
    if (this.isProcessing) {
      this.logger.warn('⚠️ Job anterior ainda processando, pulando execução');
      return;
    }

    this.isProcessing = true;

    try {
      this.logger.log('🕐 [CRON] Iniciando verificação de campanhas agendadas');

      const now = new Date();

      // Buscar campanhas agendadas prontas para disparar
      // - schedule_date <= now (data de agendamento já passou)
      // - status = 3 (agendada) ou 0 (pendente)
      // - canceled = 0 (não cancelada)
      // - paused = 0 (não pausada)
      const scheduledCampaigns = await this.campaignRepository.find({
        where: [
          {
            schedule_date: LessThanOrEqual(now),
            status: 3, // Agendada
            canceled: 0,
            paused: 0,
          },
          {
            schedule_date: LessThanOrEqual(now),
            status: 0, // Pendente com schedule_date
            canceled: 0,
            paused: 0,
          },
        ],
        order: { schedule_date: 'ASC' }, // Mais antigas primeiro
      });

      if (scheduledCampaigns.length === 0) {
        this.logger.debug('✅ Nenhuma campanha agendada para disparar');
        return;
      }

      this.logger.log(`📋 Encontradas ${scheduledCampaigns.length} campanha(s) para disparar`);

      // Enfileirar cada campanha para processamento
      let successCount = 0;
      let errorCount = 0;

      for (const campaign of scheduledCampaigns) {
        try {
          // Verificar se não foi cancelada/pausada entre a query e agora
          if (campaign.canceled === 1 || campaign.paused === 1) {
            this.logger.warn(`⚠️ Campanha #${campaign.id} foi cancelada/pausada, pulando`);
            continue;
          }

          // Enfileirar job de processamento
          await this.campaignsQueue.add('process-campaign', {
            campaignId: campaign.id,
          }, {
            attempts: 3,
            backoff: {
              type: 'exponential',
              delay: 5000,
            },
          });

          this.logger.log(`✅ Campanha #${campaign.id} enfileirada (agendada para ${campaign.schedule_date})`);
          successCount++;
        } catch (error: unknown) {
          this.logger.error(`❌ Erro ao enfileirar campanha #${campaign.id}`, {
            error: error instanceof Error ? error.message : String(error),
          });
          errorCount++;
        }
      }

      this.logger.log(`🎉 [CRON] Processamento concluído: ${successCount} enfileiradas, ${errorCount} erros`);
    } catch (error: unknown) {
      this.logger.error('❌ [CRON] Erro crítico ao processar campanhas agendadas', {
        error: error instanceof Error ? error.message : String(error),
        stack: error instanceof Error ? error.stack : undefined,
      });
    } finally {
      this.isProcessing = false;
    }
  }

  /**
   * Manual trigger for testing
   * Útil para testes sem precisar esperar o cron
   */
  async manualDispatch() {
    this.logger.log('🔧 Disparo manual de campanhas agendadas');
    await this.dispatchScheduledCampaigns();
  }
}
