import { Processor, Process } from '@nestjs/bull';
import type { Job } from 'bull';
import { Logger, Inject } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Message, Campaign } from '../../database/entities';
import type { IWhatsAppProvider } from '../../whatsapp/providers/whatsapp-provider.interface';
import { WHATSAPP_PROVIDER } from '../../whatsapp/providers/whatsapp-provider.interface';

export interface WhatsAppMessageJob {
  messageId: number;
  campaignId: number;
  instanceName: string;
  phone: string;
  text?: string;
  mediaUrl?: string;
  mediaType?: 'image' | 'video' | 'audio' | 'document';
  caption?: string;
}

@Processor('whatsapp-message')
export class WhatsappMessageProcessor {
  private readonly logger = new Logger(WhatsappMessageProcessor.name);

  constructor(
    @InjectRepository(Message)
    private readonly messageRepository: Repository<Message>,
    @InjectRepository(Campaign)
    private readonly campaignRepository: Repository<Campaign>,
    @Inject(WHATSAPP_PROVIDER)
    private readonly whatsappProvider: IWhatsAppProvider,
  ) {}

  @Process()
  async handleMessage(job: Job<WhatsAppMessageJob>) {
    this.logger.log(`Processing message job ${job.id}`);

    const { messageId, campaignId, instanceName, phone, text, mediaUrl, mediaType, caption } = job.data;

    try {
      let result;

      if (mediaUrl && mediaType) {
        result = await this.whatsappProvider.sendMedia(instanceName, {
          to: phone,
          mediaUrl,
          mediaType,
          caption,
        });
      } else if (text) {
        result = await this.whatsappProvider.sendText(instanceName, {
          to: phone,
          text,
        });
      } else {
        throw new Error('No message content provided');
      }

      // Update message status
      await this.messageRepository.update(messageId, {
        status: 1, // sent
        external_id: result.messageId,
      });

      // Update campaign progress
      await this.campaignRepository.increment({ id: campaignId }, 'total_sent', 1);

      this.logger.log(`Message ${messageId} sent successfully`);

      return result;
    } catch (error) {
      this.logger.error(`Failed to send message ${messageId}`, error);

      // Update message status to failed
      await this.messageRepository.update(messageId, {
        status: 4, // failed
      });

      throw error;
    }
  }
}
