import { Module } from '@nestjs/common';
import { BullModule } from '@nestjs/bull';
import { TypeOrmModule } from '@nestjs/typeorm';
import { redisConfig, QUEUE_NAMES, bullDefaultJobOptions } from '../config/redis.config';
import { WhatsappModule } from '../whatsapp/whatsapp.module';

// Processors
import { CampaignsProcessor } from './processors/campaigns.processor';
import { SimplifiedPublicProcessor } from './processors/simplified-public.processor';
import { CustomPublicProcessor } from './processors/custom-public.processor';
import { WhatsappMessageProcessor } from './processors/whatsapp-message.processor';

// Entities
import { Campaign } from '../database/entities/campaign.entity';
import { PublicByContact } from '../database/entities/public-by-contact.entity';
import { SimplifiedPublic } from '../database/entities/simplified-public.entity';
import { CustomPublic } from '../database/entities/custom-public.entity';
import { Number } from '../database/entities/number.entity';
import { Message } from '../database/entities/message.entity';
import { Contact } from '../database/entities/contact.entity';
import { Public } from '../database/entities/public.entity';

/**
 * Queue Module
 *
 * Módulo central para gerenciamento de filas assíncronas usando Bull + Redis.
 *
 * Queues disponíveis:
 * - campaigns: Processamento e disparo de campanhas agendadas
 * - simplified-public: Processamento de públicos simplificados
 * - custom-public: Processamento de públicos customizados (XLSX)
 * - whatsapp-message: Envio de mensagens WhatsApp via WAHA
 *
 * Cada queue possui:
 * - Retry automático (3 tentativas com backoff exponencial)
 * - Remoção automática de jobs completados
 * - Persistência de jobs falhados para debug
 */
@Module({
  imports: [
    // TypeORM entities
    TypeOrmModule.forFeature([
      Campaign,
      PublicByContact,
      SimplifiedPublic,
      CustomPublic,
      Number,
      Message,
      Contact,
      Public,
    ]),
    // Configuração global do Bull
    BullModule.forRoot({
      redis: redisConfig,
      defaultJobOptions: bullDefaultJobOptions,
    }),
    // Registro das queues
    BullModule.registerQueue(
      { name: QUEUE_NAMES.CAMPAIGNS },
      { name: QUEUE_NAMES.SIMPLIFIED_PUBLIC },
      { name: QUEUE_NAMES.CUSTOM_PUBLIC },
      { name: QUEUE_NAMES.WHATSAPP_MESSAGE },
    ),
    // WhatsApp module for WAHA service
    WhatsappModule,
  ],
  providers: [
    CampaignsProcessor,
    SimplifiedPublicProcessor,
    CustomPublicProcessor,
    WhatsappMessageProcessor,
  ],
  exports: [BullModule],
})
export class QueueModule {}
