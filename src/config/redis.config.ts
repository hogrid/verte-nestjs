import type { QueueOptions } from 'bull';

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
} as const;

export type QueueName = typeof QUEUE_NAMES[keyof typeof QUEUE_NAMES];
