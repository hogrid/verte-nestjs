import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { InjectQueue } from '@nestjs/bull';
import type { Queue } from 'bull';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, LessThanOrEqual } from 'typeorm';
import { QUEUE_NAMES } from '../config/redis.config';
import { Campaign } from '../database/entities/campaign.entity';
import { Number } from '../database/entities/number.entity';
import { ContactsService } from '../contacts/contacts.service';

/**
 * ScheduleService
 *
 * Gerencia tarefas agendadas (cron jobs) do sistema.
 *
 * Jobs implementados:
 * - dispatchScheduledCampaigns: Verifica e dispara campanhas agendadas (a cada minuto)
 * - syncContactsPeriodic: Sincroniza contatos de instâncias conectadas (a cada 30 minutos)
 *
 * Compatibilidade: Laravel Schedule (app/Console/Kernel.php)
 */
@Injectable()
export class ScheduleService {
  private readonly logger = new Logger(ScheduleService.name);
  private isProcessing = false; // Prevenir execuções paralelas
  private isSyncingContacts = false; // Prevenir sync paralelos

  constructor(
    @InjectRepository(Campaign)
    private readonly campaignRepository: Repository<Campaign>,
    @InjectRepository(Number)
    private readonly numberRepository: Repository<Number>,
    @InjectQueue(QUEUE_NAMES.CAMPAIGNS)
    private readonly campaignsQueue: Queue,
    private readonly contactsService: ContactsService,
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

      this.logger.log(
        `📋 Encontradas ${scheduledCampaigns.length} campanha(s) para disparar`,
      );

      // Enfileirar cada campanha para processamento
      let successCount = 0;
      let errorCount = 0;

      for (const campaign of scheduledCampaigns) {
        try {
          // Verificar se não foi cancelada/pausada entre a query e agora
          if (campaign.canceled === 1 || campaign.paused === 1) {
            this.logger.warn(
              `⚠️ Campanha #${campaign.id} foi cancelada/pausada, pulando`,
            );
            continue;
          }

          // Enfileirar job de processamento
          await this.campaignsQueue.add(
            'process-campaign',
            {
              campaignId: campaign.id,
            },
            {
              attempts: 3,
              backoff: {
                type: 'exponential',
                delay: 5000,
              },
            },
          );

          const scheduleDateStr = campaign.schedule_date
            ? campaign.schedule_date.toISOString()
            : 'n/a';
          this.logger.log(
            `✅ Campanha #${campaign.id} enfileirada (agendada para ${scheduleDateStr})`,
          );
          successCount++;
        } catch (error: unknown) {
          this.logger.error(`❌ Erro ao enfileirar campanha #${campaign.id}`, {
            error:
              error instanceof Error
                ? error.message
                : typeof error === 'string'
                  ? error
                  : JSON.stringify(error),
          });
          errorCount++;
        }
      }

      this.logger.log(
        `🎉 [CRON] Processamento concluído: ${successCount} enfileiradas, ${errorCount} erros`,
      );
    } catch (error: unknown) {
      this.logger.error(
        '❌ [CRON] Erro crítico ao processar campanhas agendadas',
        {
          error:
            error instanceof Error
              ? error.message
              : typeof error === 'string'
                ? error
                : JSON.stringify(error),
          stack: error instanceof Error ? error.stack : undefined,
        },
      );
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

  /**
   * Sync Contacts Periodic
   *
   * Executa a cada 30 minutos para sincronizar contatos
   * de todas as instâncias WhatsApp conectadas.
   */
  @Cron(CronExpression.EVERY_30_MINUTES, {
    name: 'sync-contacts-periodic',
    timeZone: 'America/Sao_Paulo',
  })
  async syncContactsPeriodic() {
    if (this.isSyncingContacts) {
      this.logger.warn('⚠️ Sync anterior ainda em andamento, pulando');
      return;
    }

    this.isSyncingContacts = true;

    try {
      this.logger.log(
        '📱 [CRON] Iniciando sincronização periódica de contatos',
      );

      // Buscar todas as instâncias WhatsApp conectadas
      const connectedNumbers = await this.numberRepository.find({
        where: {
          status: 1, // Ativo
          status_connection: 1, // Conectado
        },
      });

      if (connectedNumbers.length === 0) {
        this.logger.debug(
          '✅ Nenhuma instância WhatsApp conectada para sincronizar',
        );
        return;
      }

      this.logger.log(
        `📋 Encontradas ${connectedNumbers.length} instância(s) conectada(s)`,
      );

      let successCount = 0;
      let errorCount = 0;

      for (const number of connectedNumbers) {
        try {
          // Verificar se tem cel (número do telefone) - necessário para sync
          if (!number.cel) {
            this.logger.warn(
              `⚠️ Instância ${number.instance} sem número de telefone, pulando`,
            );
            continue;
          }

          const result = await this.contactsService.syncFromEvolution(
            number.user_id,
          );

          this.logger.log(
            `✅ User ${number.user_id}: ${result.imported}/${result.total} contatos sincronizados`,
          );
          successCount++;
        } catch (error) {
          this.logger.error(
            `❌ Erro ao sincronizar contatos do user ${number.user_id}:`,
            error instanceof Error
              ? error.message
              : typeof error === 'string'
                ? error
                : JSON.stringify(error),
          );
          errorCount++;
        }
      }

      this.logger.log(
        `🎉 [CRON] Sync de contatos concluído: ${successCount} sucesso, ${errorCount} erros`,
      );
    } catch (error) {
      this.logger.error(
        '❌ [CRON] Erro crítico ao sincronizar contatos',
        error instanceof Error
          ? error.message
          : typeof error === 'string'
            ? error
            : JSON.stringify(error),
      );
    } finally {
      this.isSyncingContacts = false;
    }
  }

  /**
   * Manual trigger for contacts sync
   */
  async manualContactsSync() {
    this.logger.log('🔧 Disparo manual de sincronização de contatos');
    await this.syncContactsPeriodic();
  }
}
