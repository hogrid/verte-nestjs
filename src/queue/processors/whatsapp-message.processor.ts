import { Process, Processor } from '@nestjs/bull';
import { Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { InjectQueue } from '@nestjs/bull';
import type { Job, Queue } from 'bull';
import { QUEUE_NAMES } from '../../config/redis.config';
import { PublicByContact } from '../../database/entities/public-by-contact.entity';
import { Campaign } from '../../database/entities/campaign.entity';
import { getErrorStack, getErrorMessage } from '../queue.helpers';
import axios from 'axios';

interface WhatsappMessageJobData {
  campaignId: number;
  contactId: number;
  publicByContactId: number;
  numberId: number;
  sessionName: string;
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
 * Envia mensagens WhatsApp via WAHA API de forma assíncrona.
 *
 * Fluxo:
 * 1. Recebe dados da campanha e contato
 * 2. Para cada mensagem da campanha:
 *    - Envia via WAHA API (text, image, video, audio, etc)
 *    - Aguarda intervalo entre mensagens (evitar spam)
 *    - Trata erros e retry automático
 * 3. Atualiza PublicByContact com status de envio
 * 4. Atualiza Campaign com progresso
 *
 * Compatibilidade: Laravel WhatsappMessageJob + WAHA integration
 */
@Processor(QUEUE_NAMES.WHATSAPP_MESSAGE)
export class WhatsappMessageProcessor {
  private readonly logger = new Logger(WhatsappMessageProcessor.name);
  private readonly wahaUrl: string;
  private readonly wahaApiKey: string;

  constructor(
    @InjectRepository(PublicByContact)
    private readonly publicByContactRepository: Repository<PublicByContact>,
    @InjectRepository(Campaign)
    private readonly campaignRepository: Repository<Campaign>,
    @InjectQueue(QUEUE_NAMES.CAMPAIGNS)
    private readonly campaignsQueue: Queue,
  ) {
    this.wahaUrl = process.env.WAHA_URL || 'http://localhost:8080';
    this.wahaApiKey = process.env.API_WHATSAPP_GLOBALKEY || '';
  }

  /**
   * Send campaign messages to a contact
   */
  @Process('send-campaign-messages')
  async handleSendCampaignMessages(job: Job<WhatsappMessageJobData>) {
    const { campaignId, contactId, publicByContactId, sessionName, messages, phone } = job.data;

    this.logger.log(`📤 Enviando mensagens da campanha #${campaignId} para contato #${contactId} (${phone})`);

    let allMessagesSent = true;
    let errorMessage = '';

    try {
      // Ordenar mensagens por order
      const sortedMessages = messages.sort((a, b) => (a.order || 0) - (b.order || 0));

      // Enviar cada mensagem
      for (const message of sortedMessages) {
        try {
          await this.sendMessage(sessionName, phone, message);
          this.logger.log(`✅ Mensagem ${message.order} enviada para ${phone}`);

          // Aguardar intervalo entre mensagens (1-3 segundos, variável para parecer humano)
          const delay = 1000 + Math.random() * 2000;
          await this.sleep(delay);
        } catch (error) {
          this.logger.error(`❌ Erro ao enviar mensagem ${message.order} para ${phone}`, getErrorStack(error));
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
        this.logger.warn(`⚠️ Falha no envio de mensagens para ${phone}: ${errorMessage}`);
      }
    } catch (error) {
      this.logger.error(`❌ Erro geral ao processar envio para ${phone}`, getErrorStack(error));

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
   * Send a single message via WAHA API
   */
  private async sendMessage(
    sessionName: string,
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

      switch (messageType) {
        case 'text':
          await this.sendTextMessage(sessionName, phone, message.message || '');
          break;

        case 'image':
          await this.sendMediaMessage(sessionName, phone, message.media || '', message.message, 'image');
          break;

        case 'video':
          await this.sendMediaMessage(sessionName, phone, message.media || '', message.message, 'video');
          break;

        case 'audio':
          await this.sendMediaMessage(sessionName, phone, message.media || '', message.message, 'audio');
          break;

        case 'document':
          await this.sendMediaMessage(sessionName, phone, message.media || '', message.message, 'document');
          break;

        default:
          // Default to text
          await this.sendTextMessage(sessionName, phone, message.message || '');
      }
    } catch (error) {
      this.logger.error(`❌ Erro WAHA API: ${getErrorMessage(error)}`);
      throw error;
    }
  }

  /**
   * Send text message via WAHA
   */
  private async sendTextMessage(sessionName: string, phone: string, text: string): Promise<void> {
    const url = `${this.wahaUrl}/api/sendText`;

    const response = await axios.post(
      url,
      {
        session: sessionName,
        chatId: phone,
        text: text,
      },
      {
        headers: {
          'Content-Type': 'application/json',
          'X-Api-Key': this.wahaApiKey,
        },
        timeout: 30000, // 30 segundos
      },
    );

    if (response.status !== 200 && response.status !== 201) {
      throw new Error(`WAHA API retornou status ${response.status}`);
    }

    this.logger.debug(`WAHA response:`, response.data);
  }

  /**
   * Send media message (image, video, audio, document) via WAHA
   */
  private async sendMediaMessage(
    sessionName: string,
    phone: string,
    mediaUrl: string,
    caption: string | null,
    mediaType: string,
  ): Promise<void> {
    const url = `${this.wahaUrl}/api/sendFile`;

    const payload: any = {
      session: sessionName,
      chatId: phone,
      file: {
        url: mediaUrl,
      },
    };

    // Adicionar caption se existir
    if (caption) {
      payload.file.caption = caption;
    }

    // Adicionar mimetype baseado no tipo
    if (mediaType === 'image') {
      payload.file.mimetype = 'image/jpeg';
    } else if (mediaType === 'video') {
      payload.file.mimetype = 'video/mp4';
    } else if (mediaType === 'audio') {
      payload.file.mimetype = 'audio/mpeg';
    } else if (mediaType === 'document') {
      payload.file.mimetype = 'application/pdf';
    }

    const response = await axios.post(url, payload, {
      headers: {
        'Content-Type': 'application/json',
        'X-Api-Key': this.wahaApiKey,
      },
      timeout: 60000, // 60 segundos (arquivos podem ser grandes)
    });

    if (response.status !== 200 && response.status !== 201) {
      throw new Error(`WAHA API retornou status ${response.status}`);
    }

    this.logger.debug(`WAHA media response:`, response.data);
  }

  /**
   * Sleep utility
   */
  private sleep(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }
}
