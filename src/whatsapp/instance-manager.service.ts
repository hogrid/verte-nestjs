import { Inject, Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import type { Repository } from 'typeorm';
import { Number } from '../database/entities/number.entity';
import type { IWhatsAppProvider } from './providers/whatsapp-provider.interface';
import { WHATSAPP_PROVIDER } from './providers/whatsapp-provider.interface';
import axios from 'axios';

/**
 * InstanceManagerService
 *
 * Gerenciador robusto e automático de instâncias WhatsApp
 *
 * Funcionalidades:
 * - ✅ Detecta instâncias corrompidas/travadas automaticamente
 * - ✅ Tenta recuperação automática antes de deletar
 * - ✅ Cleanup inteligente com retry logic
 * - ✅ Sincronização entre Evolution API e banco de dados
 * - ✅ Health checks periódicos
 * - ✅ Zero intervenção manual necessária
 *
 * Estados de instância:
 * - healthy: Funcionando corretamente
 * - degraded: Problemas leves, pode recuperar
 * - corrupted: Estado inconsistente, precisa cleanup
 * - stuck: Travada em estado transitório
 */
@Injectable()
export class InstanceManagerService {
  private readonly logger = new Logger(InstanceManagerService.name);

  // Configurações de retry e timeout
  private readonly MAX_RETRY_ATTEMPTS = 3;
  private readonly RETRY_DELAY_MS = 2000;
  private readonly HEALTH_CHECK_TIMEOUT_MS = 10000;
  private readonly STUCK_STATE_TIMEOUT_MS = 30000; // 30s em "connecting" = stuck

  constructor(
    @InjectRepository(Number)
    private readonly numberRepository: Repository<Number>,
    @Inject(WHATSAPP_PROVIDER)
    private readonly provider: IWhatsAppProvider,
  ) {}

  /**
   * Health check completo de uma instância
   * Retorna o estado real da instância
   */
  async checkInstanceHealth(instanceName: string): Promise<{
    healthy: boolean;
    state:
      | 'healthy'
      | 'degraded'
      | 'corrupted'
      | 'stuck'
      | 'not_found'
      | 'disconnected';
    reason?: string;
    shouldCleanup: boolean;
  }> {
    try {
      // 1. Verificar se existe na Evolution API
      const status = await this.provider.getInstanceStatus(instanceName);

      // 2. Verificar se existe no banco
      const dbRecord = await this.numberRepository.findOne({
        where: { instance: instanceName },
      });

      // Caso 1: Instância não existe mais (foi deletada)
      if (status.status === 'disconnected' && !dbRecord) {
        return {
          healthy: false,
          state: 'not_found',
          reason: 'Instance does not exist',
          shouldCleanup: false,
        };
      }

      // Caso 2: Instância conectada e funcionando (ideal)
      if (status.status === 'connected' && status.phoneNumber) {
        // Verificar se banco também está marcado como conectado
        if (dbRecord && dbRecord.status_connection === 1) {
          return {
            healthy: true,
            state: 'healthy',
            shouldCleanup: false,
          };
        } else {
          // Estado leve inconsistente: Evolution diz 'connected' mas banco diz 'disconnected'
          // Isso pode acontecer se o webhook ainda não atualizou
          // Vamos apenas atualizar o banco ao invés de fazer cleanup
          this.logger.log(
            `ℹ️ Sincronizando: Evolution='connected' mas banco='disconnected'. Atualizando banco...`,
          );
          if (dbRecord) {
            await this.numberRepository.update(dbRecord.id, {
              status_connection: 1,
              cel: status.phoneNumber,
            });
          }
          return {
            healthy: true,
            state: 'healthy',
            shouldCleanup: false,
          };
        }
      }

      // Caso 2b: Evolution diz 'connected' mas SEM número de telefone = estado fake/travado
      // Esse é o caso problemático que estávamos detectando!
      if (status.status === 'connected' && !status.phoneNumber) {
        this.logger.warn(
          `⚠️ Estado TRAVADO detectado: state='connected' mas sem número de telefone real`,
        );
        return {
          healthy: false,
          state: 'corrupted',
          reason:
            'Instância reporta conectada mas sem número de telefone (conexão fake/travada)',
          shouldCleanup: true,
        };
      }

      // Caso 3: Instância desconectada (normal, aguardando QR Code)
      if (status.status === 'disconnected' || status.status === 'qr') {
        return {
          healthy: true,
          state: 'disconnected',
          shouldCleanup: false,
        };
      }

      // Caso 4: Instância em "connecting" (pode ser normal ou stuck)
      if (status.status === 'connecting') {
        // Verificar há quanto tempo está "connecting"
        if (dbRecord?.updated_at) {
          const timeSinceUpdate =
            Date.now() - new Date(dbRecord.updated_at).getTime();
          if (timeSinceUpdate > this.STUCK_STATE_TIMEOUT_MS) {
            return {
              healthy: false,
              state: 'stuck',
              reason: `Stuck in connecting state for ${Math.round(timeSinceUpdate / 1000)}s`,
              shouldCleanup: true,
            };
          }
        }

        // Se está há pouco tempo, é degraded mas recuperável
        return {
          healthy: false,
          state: 'degraded',
          reason: 'Currently connecting',
          shouldCleanup: false,
        };
      }

      // Caso 5: Estado desconhecido/corrompido
      return {
        healthy: false,
        state: 'corrupted',
        reason: `Unknown state: ${status.status}`,
        shouldCleanup: true,
      };
    } catch (error) {
      this.logger.error(
        `❌ Erro ao verificar saúde da instância ${instanceName}`,
        error,
      );
      return {
        healthy: false,
        state: 'corrupted',
        reason: `Health check failed: ${error instanceof Error ? error.message : String(error)}`,
        shouldCleanup: true,
      };
    }
  }

  /**
   * Tenta recuperar uma instância degraded/corrupted
   * Retorna true se conseguiu recuperar
   */
  async tryRecoverInstance(instanceName: string): Promise<boolean> {
    this.logger.log(`🔧 Tentando recuperar instância: ${instanceName}`);

    try {
      // Tentativa 1: Restart
      this.logger.log(`🔄 Tentativa 1: Restart da instância`);
      await this.provider.reconnectInstance(instanceName);
      await this.sleep(3000);

      const healthAfterRestart = await this.checkInstanceHealth(instanceName);
      if (
        healthAfterRestart.healthy ||
        healthAfterRestart.state === 'disconnected'
      ) {
        this.logger.log(`✅ Recuperação bem-sucedida via restart`);
        return true;
      }

      // Tentativa 2: Logout + Restart
      this.logger.log(`🔄 Tentativa 2: Logout forçado + Restart`);
      await this.forceLogout(instanceName);
      await this.sleep(2000);
      await this.provider.reconnectInstance(instanceName);
      await this.sleep(3000);

      const healthAfterLogout = await this.checkInstanceHealth(instanceName);
      if (
        healthAfterLogout.healthy ||
        healthAfterLogout.state === 'disconnected'
      ) {
        this.logger.log(`✅ Recuperação bem-sucedida via logout + restart`);
        return true;
      }

      this.logger.warn(`⚠️ Não foi possível recuperar a instância`);
      return false;
    } catch (error) {
      this.logger.error(`❌ Erro ao tentar recuperar instância`, error);
      return false;
    }
  }

  /**
   * Cleanup completo de uma instância corrompida
   * Remove da Evolution API e reseta no banco
   */
  async cleanupCorruptedInstance(instanceName: string): Promise<void> {
    this.logger.log(
      `🧹 Iniciando cleanup de instância corrompida: ${instanceName}`,
    );

    try {
      // 1. Forçar logout (pode falhar se já deslogada)
      try {
        await this.forceLogout(instanceName);
        await this.sleep(1000);
      } catch (error) {
        this.logger.warn(
          `⚠️ Logout falhou (esperado se já deslogada): ${error instanceof Error ? error.message : String(error)}`,
        );
      }

      // 2. Deletar da Evolution API
      try {
        await this.provider.deleteInstance(instanceName);
        this.logger.log(`✅ Instância deletada da Evolution API`);
      } catch (error) {
        this.logger.error(
          `❌ Erro ao deletar instância da Evolution API`,
          error,
        );
        throw error;
      }

      // 3. Resetar registro no banco
      await this.resetDatabaseRecord(instanceName);

      this.logger.log(`✅ Cleanup completo realizado para ${instanceName}`);
    } catch (error) {
      this.logger.error(`❌ Erro durante cleanup de ${instanceName}`, error);
      throw error;
    }
  }

  /**
   * Garante que uma instância está em estado saudável
   * Faz recovery automático ou cleanup se necessário
   */
  async ensureHealthyInstance(instanceName: string): Promise<{
    healthy: boolean;
    cleaned: boolean;
    recovered: boolean;
  }> {
    this.logger.log(`🛡️ Garantindo instância saudável: ${instanceName}`);

    // 1. Check inicial
    const health = await this.checkInstanceHealth(instanceName);

    // Já está saudável
    if (health.healthy || health.state === 'disconnected') {
      this.logger.log(`✅ Instância já está saudável`);
      return { healthy: true, cleaned: false, recovered: false };
    }

    // 2. Se está degraded ou stuck, tentar recovery
    if (health.state === 'degraded' || health.state === 'stuck') {
      this.logger.log(`🔧 Instância em mau estado, tentando recovery...`);
      const recovered = await this.tryRecoverInstance(instanceName);

      if (recovered) {
        return { healthy: true, cleaned: false, recovered: true };
      }

      // Se recovery falhou e deve fazer cleanup
      if (health.shouldCleanup) {
        this.logger.warn(`⚠️ Recovery falhou e cleanup necessário`);
      }
    }

    // 3. Se deve fazer cleanup (corrupted, stuck sem recovery, etc)
    if (health.shouldCleanup) {
      this.logger.log(`🧹 Instância corrompida, iniciando cleanup...`);

      try {
        await this.cleanupCorruptedInstance(instanceName);
        return { healthy: true, cleaned: true, recovered: false };
      } catch (error) {
        this.logger.error(`❌ Cleanup falhou para ${instanceName}`, error);
        return { healthy: false, cleaned: false, recovered: false };
      }
    }

    // Estado não tratado
    this.logger.warn(`⚠️ Instância em estado não esperado: ${health.state}`);
    return { healthy: false, cleaned: false, recovered: false };
  }

  /**
   * Força logout de uma instância
   */
  private async forceLogout(instanceName: string): Promise<void> {
    try {
      // Evolution API não tem método logout na interface, então fazemos via HTTP direto
      const baseUrl = process.env.EVOLUTION_API_URL || 'http://localhost:8080';
      const apiKey = process.env.EVOLUTION_API_KEY || '';

      await axios.delete(`${baseUrl}/instance/logout/${instanceName}`, {
        headers: { apikey: apiKey },
      });

      this.logger.log(`✅ Logout forçado realizado`);
    } catch (error: any) {
      // 404 é esperado se instância não existe
      if (error.response?.status === 404) {
        this.logger.log(`ℹ️ Instância não encontrada para logout (esperado)`);
        return;
      }
      throw error;
    }
  }

  /**
   * Reseta registro no banco de dados
   */
  private async resetDatabaseRecord(instanceName: string): Promise<void> {
    try {
      const record = await this.numberRepository.findOne({
        where: { instance: instanceName },
      });

      if (record) {
        await this.numberRepository.update(record.id, {
          status_connection: 0,
          cel: null,
          qrcode: null,
        });

        this.logger.log(`✅ Registro do banco resetado`);
      } else {
        this.logger.log(`ℹ️ Nenhum registro no banco para resetar`);
      }
    } catch (error) {
      this.logger.error(`❌ Erro ao resetar registro no banco`, error);
      throw error;
    }
  }

  /**
   * Helper para delay
   */
  private sleep(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }
}
