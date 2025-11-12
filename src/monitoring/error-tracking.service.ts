import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Campaign } from '../database/entities/campaign.entity';
import { PublicByContact } from '../database/entities/public-by-contact.entity';

/**
 * ErrorTrackingService
 *
 * Serviço centralizado de monitoramento e tracking de erros
 * Registra falhas em campanhas, mensagens e jobs de queue
 */
@Injectable()
export class ErrorTrackingService {
  private readonly logger = new Logger(ErrorTrackingService.name);

  // Circuit breaker state
  private readonly circuitBreakerState: Map<string, CircuitBreakerStats> =
    new Map();
  private readonly CIRCUIT_BREAKER_THRESHOLD = 5; // Número de falhas consecutivas
  private readonly CIRCUIT_BREAKER_TIMEOUT = 60000; // 1 minuto

  constructor(
    @InjectRepository(Campaign)
    private readonly campaignRepository: Repository<Campaign>,
    @InjectRepository(PublicByContact)
    private readonly publicByContactRepository: Repository<PublicByContact>,
  ) {}

  /**
   * Track campaign error
   * Registra erro em campanha e marca como falhada
   */
  async trackCampaignError(
    campaignId: number,
    error: Error | string,
    context?: Record<string, unknown>,
  ): Promise<void> {
    const errorMessage = error instanceof Error ? error.message : String(error);
    const errorStack = error instanceof Error ? error.stack : undefined;

    this.logger.error('❌ Erro em campanha', {
      campaignId,
      error: errorMessage,
      stack: errorStack,
      context,
    });

    try {
      // Update campaign with error status
      await this.campaignRepository.update(campaignId, {
        status: 2, // Cancelada
        canceled: 1,
      });

      // Track in circuit breaker
      this.recordFailure(`campaign:${campaignId}`);
    } catch (updateError: unknown) {
      this.logger.error('❌ Erro ao atualizar campanha com erro', {
        campaignId,
        error:
          updateError instanceof Error
            ? updateError.message
            : String(updateError),
      });
    }
  }

  /**
   * Track message error
   * Registra erro no envio de mensagem para contato
   */
  async trackMessageError(
    contactNumber: string,
    error: Error | string,
    context?: Record<string, unknown>,
  ): Promise<void> {
    const errorMessage = error instanceof Error ? error.message : String(error);

    this.logger.error('❌ Erro ao enviar mensagem', {
      contactNumber,
      error: errorMessage,
      context,
    });

    try {
      // Update PublicByContact with error
      await this.publicByContactRepository
        .createQueryBuilder()
        .update(PublicByContact)
        .set({ has_error: 1, send: 0 })
        .where(
          'contact_id IN (SELECT id FROM contacts WHERE number = :phone)',
          {
            phone: contactNumber,
          },
        )
        .execute();

      // Track in circuit breaker
      this.recordFailure(`message:${contactNumber}`);
    } catch (updateError: unknown) {
      this.logger.error('❌ Erro ao atualizar contato com erro', {
        contactNumber,
        error:
          updateError instanceof Error
            ? updateError.message
            : String(updateError),
      });
    }
  }

  /**
   * Track queue job error
   * Registra erro em job de queue
   */
  trackJobError(
    queueName: string,
    jobId: string | number,
    error: Error | string,
    context?: Record<string, unknown>,
  ): void {
    const errorMessage = error instanceof Error ? error.message : String(error);
    const errorStack = error instanceof Error ? error.stack : undefined;

    this.logger.error('❌ Erro em job de queue', {
      queueName,
      jobId,
      error: errorMessage,
      stack: errorStack,
      context,
    });

    // Track in circuit breaker
    this.recordFailure(`queue:${queueName}:${jobId}`);
  }

  /**
   * Circuit Breaker: Record failure
   * Registra falha e atualiza estado do circuit breaker
   */
  private recordFailure(key: string): void {
    const stats = this.circuitBreakerState.get(key) || {
      failures: 0,
      lastFailure: Date.now(),
      isOpen: false,
    };

    stats.failures++;
    stats.lastFailure = Date.now();

    // Open circuit if threshold reached
    if (stats.failures >= this.CIRCUIT_BREAKER_THRESHOLD && !stats.isOpen) {
      stats.isOpen = true;
      this.logger.warn('⚠️ Circuit breaker ABERTO', {
        key,
        failures: stats.failures,
        threshold: this.CIRCUIT_BREAKER_THRESHOLD,
      });
    }

    this.circuitBreakerState.set(key, stats);
  }

  /**
   * Circuit Breaker: Record success
   * Registra sucesso e reseta estado do circuit breaker
   */
  recordSuccess(key: string): void {
    const stats = this.circuitBreakerState.get(key);

    if (stats) {
      stats.failures = 0;
      stats.isOpen = false;
      this.circuitBreakerState.set(key, stats);
    }
  }

  /**
   * Circuit Breaker: Check if circuit is open
   * Verifica se circuit breaker está aberto para determinada chave
   */
  isCircuitOpen(key: string): boolean {
    const stats = this.circuitBreakerState.get(key);

    if (!stats || !stats.isOpen) {
      return false;
    }

    // Check if timeout has passed (half-open state)
    const timeSinceLastFailure = Date.now() - stats.lastFailure;
    if (timeSinceLastFailure > this.CIRCUIT_BREAKER_TIMEOUT) {
      this.logger.log('🔄 Circuit breaker MEIO-ABERTO (tentando recuperar)', {
        key,
      });
      stats.isOpen = false;
      stats.failures = 0;
      this.circuitBreakerState.set(key, stats);
      return false;
    }

    this.logger.warn('🚫 Circuit breaker ABERTO - requisição bloqueada', {
      key,
      failures: stats.failures,
      timeSinceLastFailure,
    });

    return true;
  }

  /**
   * Get error statistics
   * Retorna estatísticas de erros do circuit breaker
   */
  getErrorStats(): Map<string, CircuitBreakerStats> {
    return new Map(this.circuitBreakerState);
  }

  /**
   * Reset circuit breaker
   * Reseta estado do circuit breaker para determinada chave
   */
  resetCircuitBreaker(key?: string): void {
    if (key) {
      this.circuitBreakerState.delete(key);
      this.logger.log('🔄 Circuit breaker resetado', { key });
    } else {
      this.circuitBreakerState.clear();
      this.logger.log('🔄 Todos os circuit breakers resetados');
    }
  }
}

/**
 * Circuit Breaker Stats Interface
 */
interface CircuitBreakerStats {
  failures: number;
  lastFailure: number;
  isOpen: boolean;
}
