import {
  Processor,
  Process,
  OnQueueActive,
  OnQueueCompleted,
  OnQueueFailed,
  OnQueueStalled,
  OnQueueError,
} from '@nestjs/bull';
import { InjectQueue } from '@nestjs/bull';
import type { Job, Queue } from 'bull';
import { Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Campaign, Contact, Message, MessageByContact } from '../../database/entities';
import { QUEUE_NAMES, advancedRetryConfig } from '../../config/redis.config';
import type { WhatsAppMessageJob } from './whatsapp-message.processor';

export interface CampaignJob {
  campaignId: number;
  userId?: number;
}

@Processor(QUEUE_NAMES.CAMPAIGNS)
export class CampaignsProcessor {
  private readonly logger = new Logger(CampaignsProcessor.name);

  constructor(
    @InjectRepository(Campaign)
    private readonly campaignRepository: Repository<Campaign>,
    @InjectRepository(Contact)
    private readonly contactRepository: Repository<Contact>,
    @InjectRepository(Message)
    private readonly messageRepository: Repository<Message>,
    @InjectRepository(MessageByContact)
    private readonly messageByContactRepository: Repository<MessageByContact>,
    @InjectQueue(QUEUE_NAMES.WHATSAPP_MESSAGE)
    private readonly whatsappMessageQueue: Queue<WhatsAppMessageJob>,
  ) {
    this.logger.log('🔧 CampaignsProcessor inicializado');
  }

  @OnQueueActive()
  onActive(job: Job<CampaignJob>) {
    this.logger.log(`📌 [QUEUE] Job ${job.id} ativado - Campanha #${job.data.campaignId}`);
  }

  @OnQueueCompleted()
  onCompleted(job: Job<CampaignJob>, result: unknown) {
    this.logger.log(`✅ [QUEUE] Job ${job.id} completado - Campanha #${job.data.campaignId}`, {
      result,
    });
  }

  @OnQueueFailed()
  onFailed(job: Job<CampaignJob>, error: Error) {
    this.logger.error(`❌ [QUEUE] Job ${job.id} falhou - Campanha #${job.data.campaignId}`, {
      error: error.message,
      stack: error.stack,
      attempts: job.attemptsMade,
    });
  }

  @OnQueueStalled()
  onStalled(job: Job<CampaignJob>) {
    this.logger.warn(`⚠️ [QUEUE] Job ${job.id} travou (stalled) - Campanha #${job.data.campaignId}`);
  }

  @OnQueueError()
  onError(error: Error) {
    this.logger.error(`🔴 [QUEUE] Erro na fila de campanhas`, {
      error: error.message,
      stack: error.stack,
    });
  }

  @Process('process-campaign')
  async handleCampaign(job: Job<CampaignJob>) {
    const { campaignId } = job.data;
    this.logger.log(`🚀 Processando campanha #${campaignId}`);

    try {
      // 1. Buscar campanha com relações
      const campaign = await this.campaignRepository.findOne({
        where: { id: campaignId },
        relations: ['messages', 'number'],
      });

      if (!campaign) {
        throw new Error(`Campanha #${campaignId} não encontrada`);
      }

      this.logger.log(`✅ Campanha encontrada: ${campaign.name}`);

      // 2. Atualizar status para "processando" (status = 1)
      await this.campaignRepository.update(campaignId, { status: 1 });

      // 3. Buscar contatos do público (apenas ativos)
      // Contatos sincronizados do WhatsApp têm public_id = NULL
      // Públicos "Todos os Contatos" devem buscar contatos com public_id NULL
      this.logger.log('🔍 Buscando contatos com critérios:', {
        public_id: campaign.public_id,
        user_id: campaign.user_id,
        number_id: campaign.number_id,
        status: 1,
      });

      // Buscar contatos - primeiro tenta com public_id específico, depois com NULL
      let contacts = await this.contactRepository.find({
        where: {
          public_id: campaign.public_id,
          user_id: campaign.user_id,
          number_id: campaign.number_id,
          status: 1,
        },
      });

      // Se não encontrou com public_id específico, buscar contatos sem public_id (sincronizados)
      // Isso funciona para públicos "Todos os Contatos"
      if (contacts.length === 0) {
        this.logger.log('🔄 Buscando contatos sem public_id (sincronizados do WhatsApp)...');
        contacts = await this.contactRepository
          .createQueryBuilder('contact')
          .where('contact.user_id = :userId', { userId: campaign.user_id })
          .andWhere('contact.number_id = :numberId', { numberId: campaign.number_id })
          .andWhere('contact.status = :status', { status: 1 })
          .andWhere('contact.public_id IS NULL')
          .getMany();
      }

      this.logger.log(`📋 ${contacts.length} contatos encontrados para envio`);

      if (contacts.length === 0) {
        this.logger.warn(`⚠️ Nenhum contato ativo encontrado para campanha #${campaignId}`);
        await this.campaignRepository.update(campaignId, {
          status: 2, // Completada (sem contatos)
          progress: 100,
        });
        return { success: true, campaignId, contactsCount: 0, messagesEnqueued: 0 };
      }

      // 4. Ordenar mensagens por order
      const messages = (campaign.messages || []).sort(
        (a, b) => (a.order || 0) - (b.order || 0),
      );

      if (messages.length === 0) {
        this.logger.warn(`⚠️ Nenhuma mensagem encontrada para campanha #${campaignId}`);
        await this.campaignRepository.update(campaignId, {
          status: 2,
          progress: 100,
        });
        return { success: true, campaignId, contactsCount: contacts.length, messagesEnqueued: 0 };
      }

      // 5. Obter instância do WhatsApp
      const instanceName = campaign.number?.instance || `instance_${campaign.number_id}`;
      this.logger.log(`📱 Usando instância WhatsApp: ${instanceName}`);

      // 6. Enfileirar job de mensagem para cada contato/mensagem
      let enqueued = 0;
      const totalJobs = contacts.length * messages.length;

      for (const contact of contacts) {
        for (const message of messages) {
          // Criar registro de rastreamento MessageByContact
          const messageByContact = this.messageByContactRepository.create({
            message_id: message.id,
            contact_id: contact.id,
            user_id: campaign.user_id,
            send: 0,
            delivered: 0,
            read: 0,
            has_error: 0,
          });
          const savedMBC = await this.messageByContactRepository.save(messageByContact);

          // Determinar tipo de mídia
          let mediaType: 'image' | 'video' | 'audio' | 'document' | undefined;
          if (message.media && message.type && message.type > 1) {
            mediaType = this.getMediaType(message.type);
          }

          // Enfileirar job de mensagem
          await this.whatsappMessageQueue.add(
            'send-message',
            {
              messageByContactId: savedMBC.id,
              messageId: message.id,
              campaignId: campaign.id,
              instanceName,
              phone: contact.number || '',
              text: !mediaType ? (message.message || '') : undefined,
              mediaUrl: message.media || undefined,
              mediaType,
              caption: mediaType ? (message.message || undefined) : undefined,
            },
            {
              ...advancedRetryConfig.messages,
              delay: enqueued * 1500, // 1.5s delay entre mensagens para evitar spam
            },
          );

          enqueued++;
        }
      }

      this.logger.log(`📤 ${enqueued} jobs de mensagem enfileirados`);

      // 7. Atualizar total_contacts na campanha
      await this.campaignRepository.update(campaignId, {
        total_contacts: contacts.length,
      });

      return {
        success: true,
        campaignId,
        contactsCount: contacts.length,
        messagesCount: messages.length,
        messagesEnqueued: enqueued,
      };
    } catch (error) {
      this.logger.error(`❌ Erro ao processar campanha #${campaignId}`, {
        error: error instanceof Error ? error.message : String(error),
        stack: error instanceof Error ? error.stack : undefined,
      });

      // Voltar campanha para status pendente em caso de erro
      await this.campaignRepository.update(campaignId, { status: 0 });
      throw error;
    }
  }

  private getMediaType(type: number): 'image' | 'video' | 'audio' | 'document' {
    switch (type) {
      case 2:
        return 'image';
      case 3:
        return 'audio';
      case 4:
        return 'video';
      case 5:
        return 'document';
      default:
        return 'image';
    }
  }
}
