import {
  Processor,
  Process,
  OnQueueActive,
  OnQueueCompleted,
  OnQueueFailed,
  OnQueueStalled,
  OnQueueError,
} from '@nestjs/bull';
import type { Job } from 'bull';
import { Logger, Inject } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Campaign, MessageByContact, Message } from '../../database/entities';
import type { IWhatsAppProvider } from '../../whatsapp/providers/whatsapp-provider.interface';
import { WHATSAPP_PROVIDER } from '../../whatsapp/providers/whatsapp-provider.interface';
import { QUEUE_NAMES } from '../../config/redis.config';

export interface WhatsAppMessageJob {
  messageByContactId?: number; // ID do registro de rastreamento
  messageId: number;
  campaignId: number;
  instanceName: string;
  phone: string;
  text?: string;
  mediaUrl?: string;
  mediaType?: 'image' | 'video' | 'audio' | 'document';
  caption?: string;
}

@Processor(QUEUE_NAMES.WHATSAPP_MESSAGE)
export class WhatsappMessageProcessor {
  private readonly logger = new Logger(WhatsappMessageProcessor.name);

  constructor(
    @InjectRepository(MessageByContact)
    private readonly messageByContactRepository: Repository<MessageByContact>,
    @InjectRepository(Campaign)
    private readonly campaignRepository: Repository<Campaign>,
    @InjectRepository(Message)
    private readonly messageRepository: Repository<Message>,
    @Inject(WHATSAPP_PROVIDER)
    private readonly whatsappProvider: IWhatsAppProvider,
  ) {
    this.logger.log('🔧 WhatsappMessageProcessor inicializado');
  }

  @OnQueueActive()
  onActive(job: Job<WhatsAppMessageJob>) {
    this.logger.log(
      `📌 [MSG-QUEUE] Job ${job.id} ativado - Phone: ${job.data.phone?.substring(0, 8)}***`,
    );
  }

  @OnQueueCompleted()
  onCompleted(job: Job<WhatsAppMessageJob>) {
    this.logger.log(
      `✅ [MSG-QUEUE] Job ${job.id} completado - Campanha #${job.data.campaignId}`,
    );
  }

  @OnQueueFailed()
  onFailed(job: Job<WhatsAppMessageJob>, error: Error) {
    this.logger.error(
      `❌ [MSG-QUEUE] Job ${job.id} falhou - Campanha #${job.data.campaignId}`,
      {
        error: error.message,
        phone: job.data.phone?.substring(0, 8) + '***',
        attempts: job.attemptsMade,
      },
    );
  }

  @OnQueueStalled()
  onStalled(job: Job<WhatsAppMessageJob>) {
    this.logger.warn(`⚠️ [MSG-QUEUE] Job ${job.id} travou (stalled)`);
  }

  @OnQueueError()
  onError(error: Error) {
    this.logger.error(`🔴 [MSG-QUEUE] Erro na fila de mensagens`, {
      error: error.message,
    });
  }

  @Process('send-message')
  async handleMessage(job: Job<WhatsAppMessageJob>) {
    const {
      messageByContactId,
      messageId,
      campaignId,
      instanceName,
      phone,
      text,
      mediaUrl,
      mediaType,
      caption,
    } = job.data;

    this.logger.log(`📤 Enviando mensagem`, {
      jobId: job.id,
      campaignId,
      messageId,
      phone: phone.substring(0, 8) + '***',
      hasMedia: !!mediaUrl,
    });

    try {
      let result;

      if (mediaUrl && mediaType) {
        // Enviar mídia com ou sem legenda
        result = await this.whatsappProvider.sendMedia(instanceName, {
          to: phone,
          mediaUrl,
          mediaType,
          caption,
        });
      } else if (text) {
        // Enviar mensagem de texto
        result = await this.whatsappProvider.sendText(instanceName, {
          to: phone,
          text,
        });
      } else {
        throw new Error('Nenhum conteúdo de mensagem fornecido');
      }

      // Atualizar MessageByContact como enviado
      if (messageByContactId) {
        await this.messageByContactRepository.update(messageByContactId, {
          send: 1,
          has_error: 0,
          error_message: null,
        });
      }

      // Incrementar contador de mensagens enviadas na campanha
      await this.campaignRepository.increment(
        { id: campaignId },
        'total_sent',
        1,
      );

      // Verificar se campanha foi completada
      await this.checkCampaignCompletion(campaignId);

      this.logger.log(`✅ Mensagem enviada com sucesso`, {
        jobId: job.id,
        messageId,
        externalId: result?.messageId,
      });

      return result;
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : String(error);

      this.logger.error(`❌ Falha ao enviar mensagem`, {
        jobId: job.id,
        messageId,
        phone: phone.substring(0, 8) + '***',
        error: errorMessage,
      });

      // Atualizar MessageByContact como erro
      if (messageByContactId) {
        await this.messageByContactRepository.update(messageByContactId, {
          send: 0,
          has_error: 1,
          error_message: errorMessage.substring(0, 500),
        });
      }

      throw error;
    }
  }

  /**
   * Verifica se a campanha foi completada e atualiza o status
   */
  private async checkCampaignCompletion(campaignId: number): Promise<void> {
    const campaign = await this.campaignRepository.findOne({
      where: { id: campaignId },
    });

    if (!campaign) return;

    // Contar quantas mensagens a campanha tem
    const messagesCount = await this.messageRepository.count({
      where: { campaign_id: campaignId },
    });

    const totalSent = campaign.total_sent || 0;
    const totalContacts = campaign.total_contacts || 0;

    // Total esperado = contatos * mensagens por campanha
    const totalExpected = totalContacts * Math.max(1, messagesCount);

    if (totalExpected > 0 && totalSent >= totalExpected) {
      await this.campaignRepository.update(campaignId, {
        status: 2, // Completada
        progress: 100,
        date_finished: new Date(),
      });

      this.logger.log(`🎉 Campanha #${campaignId} completada!`, {
        totalSent,
        totalContacts,
        messagesCount,
        totalExpected,
      });
    } else if (totalExpected > 0) {
      // Atualizar progresso baseado no total esperado
      const progress = Math.min(
        100,
        Math.round((totalSent / totalExpected) * 100),
      );
      await this.campaignRepository.update(campaignId, { progress });
    }
  }
}
