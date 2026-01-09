import { Module } from '@nestjs/common';
import { BullModule } from '@nestjs/bull';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ConfigModule, ConfigService } from '@nestjs/config';
import {
  QUEUE_NAMES,
  bullDefaultJobOptions,
  createMockQueueProviders,
} from '../config/redis.config';
import { WhatsappModule } from '../whatsapp/whatsapp.module';
import { MonitoringModule } from '../monitoring/monitoring.module';

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
import { MessageByContact } from '../database/entities/message-by-contact.entity';
import { Contact } from '../database/entities/contact.entity';
import { Publics } from '../database/entities/publics.entity';

/**
 * Queue Module
 *
 * Módulo central para gerenciamento de filas assíncronas usando Bull + Redis.
 *
 * **ARQUITETURA DESACOPLADA**:
 * - Importa WhatsappModule que exporta WHATSAPP_PROVIDER
 * - Processors usam IWhatsAppProvider interface (não depende de implementação)
 * - Permite trocar provider WhatsApp sem alterar lógica de filas
 *
 * Queues disponíveis:
 * - campaigns: Processamento e disparo de campanhas agendadas
 * - simplified-public: Processamento de públicos simplificados
 * - custom-public: Processamento de públicos customizados (XLSX)
 * - whatsapp-message: Envio de mensagens WhatsApp via IWhatsAppProvider
 *
 * Cada queue possui:
 * - Retry automático (3 tentativas com backoff exponencial)
 * - Remoção automática de jobs completados
 * - Persistência de jobs falhados para debug
 */
const isMock = process.env.MOCK_BULL === '1';
const mockProviders = isMock
  ? (createMockQueueProviders() as any)
  : ([] as any);

@Module({
  imports: [
    TypeOrmModule.forFeature([
      Campaign,
      PublicByContact,
      SimplifiedPublic,
      CustomPublic,
      Number,
      Message,
      MessageByContact,
      Contact,
      Publics,
    ]),
    ...(isMock
      ? []
      : [
          BullModule.forRootAsync({
            imports: [ConfigModule],
            inject: [ConfigService],
            useFactory: (configService: ConfigService) => ({
              redis: {
                host: configService.get('REDIS_HOST', '127.0.0.1'),
                port: configService.get<number>('REDIS_PORT', 6379),
                password: configService.get('REDIS_PASSWORD') || undefined,
                db: configService.get<number>('REDIS_DB', 0),
                retryStrategy: (times: number) => {
                  const delay = Math.min(times * 50, 3000);
                  return delay;
                },
                maxRetriesPerRequest: 3,
              },
              defaultJobOptions: bullDefaultJobOptions,
            }),
          }),
          BullModule.registerQueue(
            { name: QUEUE_NAMES.CAMPAIGNS },
            { name: QUEUE_NAMES.SIMPLIFIED_PUBLIC },
            { name: QUEUE_NAMES.CUSTOM_PUBLIC },
            { name: QUEUE_NAMES.WHATSAPP_MESSAGE },
          ),
          BullModule.registerQueue(
            { name: QUEUE_NAMES.CAMPAIGNS_DLQ },
            { name: QUEUE_NAMES.SIMPLIFIED_PUBLIC_DLQ },
            { name: QUEUE_NAMES.CUSTOM_PUBLIC_DLQ },
            { name: QUEUE_NAMES.WHATSAPP_MESSAGE_DLQ },
          ),
        ]),
    WhatsappModule,
    MonitoringModule,
  ],
  providers: [
    ...(isMock
      ? ([] as any)
      : [
          CampaignsProcessor,
          SimplifiedPublicProcessor,
          CustomPublicProcessor,
          WhatsappMessageProcessor,
        ]),
    ...mockProviders,
  ],
  exports: [...(isMock ? mockProviders : [BullModule])],
})
export class QueueModule {}
