import type { QueueOptions } from 'bull';
import { getQueueToken } from '@nestjs/bull';

/**
 * Redis Configuration
 *
 * Configuração do Redis para Bull Queue e cache.
 * Usado para jobs assíncronos de campanhas, públicos e WhatsApp.
 */
export const redisConfig: QueueOptions['redis'] = {
  host: process.env.REDIS_HOST || 'localhost',
  port: parseInt(process.env.REDIS_PORT || '6379', 10),
  password: process.env.REDIS_PASSWORD || undefined,
  db: parseInt(process.env.REDIS_DB || '0', 10),
  retryStrategy: (times: number) => {
    // Retry logic: exponential backoff up to 3 seconds
    const delay = Math.min(times * 50, 3000);
    return delay;
  },
  maxRetriesPerRequest: 3,
};

/**
 * Bull Queue Options
 *
 * Configurações padrão para todas as queues do Bull.
 */
export const bullDefaultJobOptions = {
  attempts: 3, // Tentar 3 vezes antes de falhar
  backoff: {
    type: 'exponential',
    delay: 2000, // 2s, 4s, 8s
  },
  removeOnComplete: true, // Remove jobs completados para economizar memória
  removeOnFail: false, // Mantém jobs falhados para debug
  timeout: 60000, // 1 minuto de timeout por job
};

/**
 * Advanced Retry Configuration
 *
 * Configurações avançadas de retry com backoff customizado
 */
export const advancedRetryConfig = {
  campaigns: {
    attempts: 5, // Campanhas: até 5 tentativas
    backoff: {
      type: 'exponential' as const,
      delay: 5000, // 5s, 10s, 20s, 40s, 80s
    },
  },
  messages: {
    attempts: 3, // Mensagens: até 3 tentativas
    backoff: {
      type: 'exponential' as const,
      delay: 2000, // 2s, 4s, 8s
    },
  },
  publics: {
    attempts: 4, // Públicos: até 4 tentativas
    backoff: {
      type: 'exponential' as const,
      delay: 3000, // 3s, 6s, 12s, 24s
    },
  },
};

/**
 * Queue Names
 *
 * Nomes das queues utilizadas no sistema.
 */
export const QUEUE_NAMES = {
  CAMPAIGNS: 'campaigns',
  SIMPLIFIED_PUBLIC: 'simplified-public',
  CUSTOM_PUBLIC: 'custom-public',
  WHATSAPP_MESSAGE: 'whatsapp-message',
  // Dead Letter Queues
  CAMPAIGNS_DLQ: 'campaigns-dlq',
  SIMPLIFIED_PUBLIC_DLQ: 'simplified-public-dlq',
  CUSTOM_PUBLIC_DLQ: 'custom-public-dlq',
  WHATSAPP_MESSAGE_DLQ: 'whatsapp-message-dlq',
} as const;

export type QueueName = (typeof QUEUE_NAMES)[keyof typeof QUEUE_NAMES];

/**
 * Dead Letter Queue Mapping
 *
 * Mapeia cada queue principal para sua respectiva Dead Letter Queue
 */
export const DLQ_MAPPING: Record<string, string> = {
  [QUEUE_NAMES.CAMPAIGNS]: QUEUE_NAMES.CAMPAIGNS_DLQ,
  [QUEUE_NAMES.SIMPLIFIED_PUBLIC]: QUEUE_NAMES.SIMPLIFIED_PUBLIC_DLQ,
  [QUEUE_NAMES.CUSTOM_PUBLIC]: QUEUE_NAMES.CUSTOM_PUBLIC_DLQ,
  [QUEUE_NAMES.WHATSAPP_MESSAGE]: QUEUE_NAMES.WHATSAPP_MESSAGE_DLQ,
};

/**
 * Get Dead Letter Queue name for a given queue
 */
export function getDLQName(queueName: string): string | undefined {
  return DLQ_MAPPING[queueName];
}

/**
 * Utilities for tests: create mock providers for Bull queues
 */
export function createMockQueueProviders() {
  const names = [
    QUEUE_NAMES.CAMPAIGNS,
    QUEUE_NAMES.SIMPLIFIED_PUBLIC,
    QUEUE_NAMES.CUSTOM_PUBLIC,
    QUEUE_NAMES.WHATSAPP_MESSAGE,
    QUEUE_NAMES.CAMPAIGNS_DLQ,
    QUEUE_NAMES.SIMPLIFIED_PUBLIC_DLQ,
    QUEUE_NAMES.CUSTOM_PUBLIC_DLQ,
    QUEUE_NAMES.WHATSAPP_MESSAGE_DLQ,
  ];

  const fakeQueue = {
    add: async () => ({ id: 'mock-job' }),
    pause: async () => void 0,
    resume: async () => void 0,
  };

  return names.map((name) => ({
    provide: getQueueToken(name),
    useValue: fakeQueue,
  }));
}
