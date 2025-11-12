import { Process, Processor, OnQueueFailed } from '@nestjs/bull';
import { Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, LessThanOrEqual } from 'typeorm';
import type { Job, Queue } from 'bull';
import {
  QUEUE_NAMES,
  getDLQName,
  advancedRetryConfig,
} from '../../config/redis.config';
import { Campaign } from '../../database/entities/campaign.entity';
import { PublicByContact } from '../../database/entities/public-by-contact.entity';
import { Number } from '../../database/entities/number.entity';
import { Message } from '../../database/entities/message.entity';
import { InjectQueue } from '@nestjs/bull';
import { getErrorStack } from '../queue.helpers';
import { ErrorTrackingService } from '../../monitoring/error-tracking.service';

/**
 * CampaignsProcessor
 *
 * Processa campanhas agendadas e dispara envio de mensagens.
 *
 * Fluxo:
 * 1. Busca campanhas agendadas (schedule_date <= now, status = 0, canceled = 0, paused = 0)
 * 2. Verifica se número WhatsApp está conectado
 * 3. Busca contatos do público da campanha
 * 4. Para cada contato, cria job na queue 'whatsapp-message'
 * 5. Atualiza status e progresso da campanha
 *
 * Compatibilidade: Laravel CampaignsJob (app/Jobs/CampaignsJob.php)
 */
@Processor(QUEUE_NAMES.CAMPAIGNS)
export class CampaignsProcessor {
  private readonly logger = new Logger(CampaignsProcessor.name);

  constructor(
    @InjectRepository(Campaign)
    private readonly campaignRepository: Repository<Campaign>,
    @InjectRepository(PublicByContact)
    private readonly publicByContactRepository: Repository<PublicByContact>,
    @InjectRepository(Number)
    private readonly numberRepository: Repository<Number>,
    @InjectRepository(Message)
    private readonly messageRepository: Repository<Message>,
    @InjectQueue(QUEUE_NAMES.WHATSAPP_MESSAGE)
    private readonly whatsappMessageQueue: Queue,
    @InjectQueue(QUEUE_NAMES.CAMPAIGNS_DLQ)
    private readonly campaignsDLQ: Queue,
    private readonly errorTrackingService: ErrorTrackingService,
  ) {}

  /**
   * Process scheduled campaigns
   *
   * Este job roda periodicamente (ex: a cada minuto via cron ou repeat)
   * para verificar se há campanhas agendadas prontas para serem disparadas.
   */
  @Process('dispatch-scheduled-campaigns')
  async handleDispatchScheduledCampaigns(job: Job<void>) {
    this.logger.log('🚀 Iniciando disparo de campanhas agendadas...');

    try {
      // Buscar campanhas agendadas prontas para disparar
      const now = new Date();
      const scheduledCampaigns = await this.campaignRepository.find({
        where: {
          schedule_date: LessThanOrEqual(now),
          status: 0, // Pendente
          canceled: 0,
          paused: 0,
        },
        relations: ['number', 'public', 'messages'],
      });

      this.logger.log(
        `📋 Encontradas ${scheduledCampaigns.length} campanhas agendadas`,
      );

      for (const campaign of scheduledCampaigns) {
        await this.processCampaign(campaign);
      }

      this.logger.log('✅ Processamento de campanhas agendadas concluído');
    } catch (error) {
      this.logger.error(
        '❌ Erro ao processar campanhas agendadas',
        getErrorStack(error),
      );
      throw error;
    }
  }

  /**
   * Process a single campaign
   *
   * Chamado quando uma campanha específica precisa ser disparada.
   */
  @Process('process-campaign')
  async handleProcessCampaign(job: Job<{ campaignId: number }>) {
    const { campaignId } = job.data;
    this.logger.log(`🎯 Processando campanha #${campaignId}`);

    try {
      const campaign = await this.campaignRepository.findOne({
        where: { id: campaignId },
        relations: ['number', 'public', 'messages'],
      });

      if (!campaign) {
        this.logger.warn(`⚠️ Campanha #${campaignId} não encontrada`);
        return;
      }

      await this.processCampaign(campaign);

      this.logger.log(`✅ Campanha #${campaignId} processada com sucesso`);
    } catch (error) {
      this.logger.error(
        `❌ Erro ao processar campanha #${campaignId}`,
        getErrorStack(error),
      );
      throw error;
    }
  }

  /**
   * Internal method to process campaign
   */
  private async processCampaign(campaign: Campaign) {
    this.logger.log(
      `🔄 Iniciando processamento da campanha #${campaign.id}: ${campaign.name}`,
    );

    // 1. Verificar se número está conectado
    const number = await this.numberRepository.findOne({
      where: { id: campaign.number_id },
    });

    if (!number) {
      this.logger.error(
        `❌ Número #${campaign.number_id} não encontrado para campanha #${campaign.id}`,
      );
      await this.markCampaignAsFailed(
        campaign,
        'Número WhatsApp não encontrado',
      );
      return;
    }

    if (number.status !== 1) {
      this.logger.error(
        `❌ Número #${number.id} não está ativo (status: ${number.status})`,
      );
      await this.markCampaignAsFailed(
        campaign,
        'Número WhatsApp não está ativo',
      );
      return;
    }

    if (!number.status_connection || number.status_connection !== 1) {
      this.logger.error(`❌ Número #${number.id} não está conectado`);
      await this.markCampaignAsFailed(
        campaign,
        'Número WhatsApp não está conectado',
      );
      return;
    }

    // 2. Buscar contatos do público
    if (!campaign.public_id) {
      this.logger.error(`❌ Campanha #${campaign.id} não tem público definido`);
      await this.markCampaignAsFailed(
        campaign,
        'Campanha sem público definido',
      );
      return;
    }

    const contacts = await this.publicByContactRepository.find({
      where: {
        public_id: campaign.public_id,
        is_blocked: 0, // Apenas contatos não bloqueados
      },
      relations: ['contact'],
    });

    if (contacts.length === 0) {
      this.logger.warn(
        `⚠️ Nenhum contato encontrado para público #${campaign.public_id}`,
      );
      await this.markCampaignAsCompleted(campaign, 0);
      return;
    }

    this.logger.log(`📞 Encontrados ${contacts.length} contatos para envio`);

    // 3. Buscar mensagens da campanha
    const messages = await this.messageRepository.find({
      where: { campaign_id: campaign.id },
      order: { order: 'ASC' },
    });

    if (messages.length === 0) {
      this.logger.warn(
        `⚠️ Nenhuma mensagem encontrada para campanha #${campaign.id}`,
      );
      await this.markCampaignAsFailed(campaign, 'Campanha sem mensagens');
      return;
    }

    // 4. Atualizar campanha para "Em andamento"
    await this.campaignRepository.update(campaign.id, {
      status: 1, // Em andamento
      progress: 0,
      processed_contacts: 0,
    });

    // 5. Criar jobs para envio de mensagens
    let jobsCreated = 0;
    for (const publicByContact of contacts) {
      try {
        // Criar job para enviar mensagens para este contato
        await this.whatsappMessageQueue.add(
          'send-campaign-messages',
          {
            campaignId: campaign.id,
            contactId: publicByContact.contact_id,
            publicByContactId: publicByContact.id,
            numberId: campaign.number_id,
            sessionName: number.instance, // WAHA session name
            messages: messages.map((msg) => ({
              id: msg.id,
              type: msg.type,
              message: msg.message,
              media: msg.media,
              media_type: msg.media_type,
              order: msg.order,
            })),
            phone: publicByContact.contact.number, // Número do contato
          },
          {
            attempts: 3,
            backoff: {
              type: 'exponential',
              delay: 5000, // 5s, 10s, 20s
            },
            // Distribuir envios ao longo do tempo (evitar bloqueio)
            delay: jobsCreated * 2000, // 2 segundos entre cada envio
          },
        );

        jobsCreated++;
      } catch (error) {
        this.logger.error(
          `❌ Erro ao criar job para contato #${publicByContact.contact_id}`,
          getErrorStack(error),
        );
      }
    }

    this.logger.log(
      `✅ Criados ${jobsCreated} jobs de envio para campanha #${campaign.id}`,
    );

    // 6. Atualizar total_contacts se necessário
    if (!campaign.total_contacts || campaign.total_contacts === 0) {
      await this.campaignRepository.update(campaign.id, {
        total_contacts: contacts.length,
      });
    }
  }

  /**
   * Mark campaign as failed
   */
  private async markCampaignAsFailed(campaign: Campaign, reason: string) {
    this.logger.error(
      `💀 Marcando campanha #${campaign.id} como falhada: ${reason}`,
    );

    await this.campaignRepository.update(campaign.id, {
      status: 2, // Concluída (com erro)
      canceled: 1,
      progress: 0,
      date_finished: new Date(),
    });
  }

  /**
   * Mark campaign as completed
   */
  private async markCampaignAsCompleted(campaign: Campaign, totalSent: number) {
    this.logger.log(
      `✅ Marcando campanha #${campaign.id} como concluída (${totalSent} enviadas)`,
    );

    await this.campaignRepository.update(campaign.id, {
      status: 2, // Concluída
      progress: 100,
      total_sent: totalSent,
      date_finished: new Date(),
    });
  }

  /**
   * Update campaign progress
   *
   * Chamado pelos WhatsappMessageJobs ao completarem
   */
  @Process('update-campaign-progress')
  async handleUpdateCampaignProgress(
    job: Job<{ campaignId: number; contactSent: boolean }>,
  ) {
    const { campaignId, contactSent } = job.data;

    try {
      const campaign = await this.campaignRepository.findOne({
        where: { id: campaignId },
      });

      if (!campaign) {
        return;
      }

      const processedContacts = (campaign.processed_contacts || 0) + 1;
      const totalSent = contactSent
        ? (campaign.total_sent || 0) + 1
        : campaign.total_sent || 0;
      const totalContacts = campaign.total_contacts || 0;
      const progress =
        totalContacts > 0
          ? Math.round((processedContacts / totalContacts) * 100)
          : 0;

      // Atualizar campanha
      await this.campaignRepository.update(campaignId, {
        processed_contacts: processedContacts,
        total_sent: totalSent,
        progress,
      });

      // Se todos os contatos foram processados, marcar como concluída
      if (processedContacts >= totalContacts && totalContacts > 0) {
        await this.campaignRepository.update(campaignId, {
          status: 2, // Concluída
          date_finished: new Date(),
        });

        this.logger.log(
          `🎉 Campanha #${campaignId} concluída! ${totalSent}/${totalContacts} enviadas`,
        );
      } else {
        this.logger.log(
          `📊 Campanha #${campaignId}: ${processedContacts}/${totalContacts} processados (${progress}%)`,
        );
      }
    } catch (error) {
      this.logger.error(
        `❌ Erro ao atualizar progresso da campanha #${campaignId}`,
        getErrorStack(error),
      );
      throw error;
    }
  }

  /**
   * Handle failed jobs
   * Envia jobs falhados para Dead Letter Queue após esgotar tentativas
   */
  @OnQueueFailed()
  async handleFailedJob(job: Job, error: Error) {
    const { name, data, id, attemptsMade } = job;

    this.logger.error('❌ Job falhou após todas as tentativas', {
      jobName: name,
      jobId: id,
      data,
      attemptsMade,
      error: error.message,
      stack: error.stack,
    });

    // Track error in monitoring service
    if (data.campaignId) {
      await this.errorTrackingService.trackCampaignError(
        data.campaignId,
        error,
        { jobId: id, attemptsMade },
      );
    }

    this.errorTrackingService.trackJobError(QUEUE_NAMES.CAMPAIGNS, id, error, {
      jobName: name,
      data,
    });

    // Send to Dead Letter Queue
    try {
      await this.campaignsDLQ.add(
        'failed-campaign-job',
        {
          originalJob: {
            name,
            data,
            id,
            attemptsMade,
          },
          error: {
            message: error.message,
            stack: error.stack,
          },
          failedAt: new Date(),
        },
        {
          attempts: 1, // DLQ não faz retry
          removeOnComplete: false, // Manter para análise
        },
      );

      this.logger.log(`📬 Job enviado para Dead Letter Queue: campaigns-dlq`);
    } catch (dlqError) {
      this.logger.error(
        '❌ Erro ao enviar job para DLQ',
        getErrorStack(dlqError),
      );
    }
  }
}
