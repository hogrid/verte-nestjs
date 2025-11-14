import { Process, Processor } from '@nestjs/bull';
import { Inject, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { InjectQueue } from '@nestjs/bull';
import type { Job, Queue } from 'bull';
import { QUEUE_NAMES } from '../../config/redis.config';
import { PublicByContact } from '../../database/entities/public-by-contact.entity';
import { Campaign } from '../../database/entities/campaign.entity';
import { getErrorStack, getErrorMessage } from '../queue.helpers';
import type { IWhatsAppProvider } from '../../whatsapp/providers/whatsapp-provider.interface';
import { WHATSAPP_PROVIDER } from '../../whatsapp/providers/whatsapp-provider.interface';

interface WhatsappMessageJobData {
  campaignId: number;
  contactId: number;
  publicByContactId: number;
  numberId: number;
  sessionName: string; // Nome da instância WhatsApp (compatibilidade Laravel)
  messages: Array<{
    id: number;
    type: string | null;
    message: string | null;
    media: string | null;
    media_type: string | null;
    order: number | null;
  }>;
  phone: string;
}

/**
 * WhatsappMessageProcessor
 *
 * Envia mensagens WhatsApp via IWhatsAppProvider de forma assíncrona.
 *
 * **ARQUITETURA DESACOPLADA**:
 * - Usa IWhatsAppProvider interface (não depende de implementação concreta)
 * - Permite trocar provider facilmente (Evolution API, WAHA, Cloud API, etc)
 * - Provider injetado via Dependency Injection
 *
 * Fluxo:
 * 1. Recebe dados da campanha e contato
 * 2. Para cada mensagem da campanha:
 *    - Envia via WhatsApp Provider (text, image, video, audio, etc)
 *    - Aguarda intervalo entre mensagens (evitar spam)
 *    - Trata erros e retry automático
 * 3. Atualiza PublicByContact com status de envio
 * 4. Atualiza Campaign com progresso
 *
 * Compatibilidade: Laravel WhatsappMessageJob
 */
@Processor(QUEUE_NAMES.WHATSAPP_MESSAGE)
export class WhatsappMessageProcessor {
  private readonly logger = new Logger(WhatsappMessageProcessor.name);

  constructor(
    @InjectRepository(PublicByContact)
    private readonly publicByContactRepository: Repository<PublicByContact>,
    @InjectRepository(Campaign)
    private readonly campaignRepository: Repository<Campaign>,
    @InjectQueue(QUEUE_NAMES.CAMPAIGNS)
    private readonly campaignsQueue: Queue,
    @Inject(WHATSAPP_PROVIDER)
    private readonly whatsappProvider: IWhatsAppProvider,
  ) {
    this.logger.log(
      `📱 WhatsappMessageProcessor initialized with provider: ${this.whatsappProvider.providerName} (${this.whatsappProvider.providerVersion})`,
    );
  }

  /**
   * Send campaign messages to a contact
   */
  @Process('send-campaign-messages')
  async handleSendCampaignMessages(job: Job<WhatsappMessageJobData>) {
    const {
      campaignId,
      contactId,
      publicByContactId,
      sessionName,
      messages,
      phone,
    } = job.data;

    this.logger.log(
      `📤 Enviando mensagens da campanha #${campaignId} para contato #${contactId} (${phone})`,
    );

    let allMessagesSent = true;
    let errorMessage = '';

    try {
      // Ordenar mensagens por order
      const sortedMessages = messages.sort(
        (a, b) => (a.order || 0) - (b.order || 0),
      );

      // Enviar cada mensagem
      // sessionName do Laravel é usado como instanceName do Evolution API
      const instanceName = sessionName;

      for (const message of sortedMessages) {
        try {
          await this.sendMessage(instanceName, phone, message);
          this.logger.log(`✅ Mensagem ${message.order} enviada para ${phone}`);

          // Aguardar intervalo entre mensagens (1-3 segundos, variável para parecer humano)
          const delay = 1000 + Math.random() * 2000;
          await this.sleep(delay);
        } catch (error) {
          this.logger.error(
            `❌ Erro ao enviar mensagem ${message.order} para ${phone}`,
            getErrorStack(error),
          );
          allMessagesSent = false;
          errorMessage = getErrorMessage(error);
          break; // Para no primeiro erro
        }
      }

      // Atualizar PublicByContact
      await this.publicByContactRepository.update(publicByContactId, {
        send: allMessagesSent ? 1 : 0,
        has_error: allMessagesSent ? 0 : 1,
        not_receive: allMessagesSent ? 0 : 1,
      });

      // Notificar CampaignsJob para atualizar progresso
      await this.campaignsQueue.add('update-campaign-progress', {
        campaignId,
        contactSent: allMessagesSent,
      });

      if (allMessagesSent) {
        this.logger.log(`✅ Todas as mensagens enviadas para ${phone}`);
      } else {
        this.logger.warn(
          `⚠️ Falha no envio de mensagens para ${phone}: ${errorMessage}`,
        );
      }
    } catch (error) {
      this.logger.error(
        `❌ Erro geral ao processar envio para ${phone}`,
        getErrorStack(error),
      );

      // Atualizar como erro
      await this.publicByContactRepository.update(publicByContactId, {
        send: 0,
        has_error: 1,
        not_receive: 1,
      });

      // Atualizar progresso mesmo em caso de erro
      await this.campaignsQueue.add('update-campaign-progress', {
        campaignId,
        contactSent: false,
      });

      throw error; // Re-throw para acionar retry do Bull
    }
  }

  /**
   * Send a single message via WhatsApp Provider
   * Uses IWhatsAppProvider for actual sending (architecture decoupled)
   */
  private async sendMessage(
    instanceName: string,
    phone: string,
    message: {
      type: string | null;
      message: string | null;
      media: string | null;
      media_type: string | null;
    },
  ): Promise<void> {
    try {
      const messageType = message.type || 'text';
      const messageText = message.message || '';
      const mediaUrl = message.media || '';

      switch (messageType) {
        case 'text':
        case '1': // Laravel usa número como tipo
          await this.whatsappProvider.sendText(instanceName, {
            to: phone,
            text: messageText,
          });
          break;

        case 'image':
        case '2':
          await this.whatsappProvider.sendMedia(instanceName, {
            to: phone,
            mediaUrl: mediaUrl,
            mediaType: 'image',
            caption: messageText,
          });
          break;

        case 'video':
        case '4':
          await this.whatsappProvider.sendMedia(instanceName, {
            to: phone,
            mediaUrl: mediaUrl,
            mediaType: 'video',
            caption: messageText,
          });
          break;

        case 'audio':
        case '3':
          await this.whatsappProvider.sendMedia(instanceName, {
            to: phone,
            mediaUrl: mediaUrl,
            mediaType: 'audio',
          });
          break;

        case 'document':
          await this.whatsappProvider.sendMedia(instanceName, {
            to: phone,
            mediaUrl: mediaUrl,
            mediaType: 'document',
            caption: messageText,
          });
          break;

        default:
          // Default to text
          await this.whatsappProvider.sendText(instanceName, {
            to: phone,
            text: messageText,
          });
      }

      this.logger.log(
        `✅ Mensagem ${messageType} enviada via ${this.whatsappProvider.providerName}`,
      );
    } catch (error) {
      this.logger.error(
        `❌ Erro WhatsApp Provider: ${getErrorMessage(error)}`,
      );
      throw error;
    }
  }

  /**
   * Sleep utility
   */
  private sleep(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }
}
