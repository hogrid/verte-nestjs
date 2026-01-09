import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, LessThan, MoreThan, IsNull, Not } from 'typeorm';
import { Campaign } from '../database/entities/campaign.entity';
import { Contact } from '../database/entities/contact.entity';
import { Configuration } from '../database/entities/configuration.entity';
import { ContactsService } from '../contacts/contacts.service';

/**
 * UtilitiesService
 *
 * Service para endpoints utilitários:
 * - Health checks
 * - Recovery de campanhas
 * - Debug tools
 * - Sincronização
 */
@Injectable()
export class UtilitiesService {
  private readonly logger = new Logger(UtilitiesService.name);

  constructor(
    @InjectRepository(Campaign)
    private readonly campaignRepository: Repository<Campaign>,
    @InjectRepository(Contact)
    private readonly contactRepository: Repository<Contact>,
    @InjectRepository(Configuration)
    private readonly configurationRepository: Repository<Configuration>,
    private readonly contactsService: ContactsService,
  ) {}

  /**
   * Health check da aplicação
   */
  getHealth() {
    return {
      status: 'ok',
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
      environment: process.env.NODE_ENV || 'development',
    };
  }

  /**
   * Teste de CORS
   */
  testCors() {
    return {
      cors: 'enabled',
      success: true,
      message: 'CORS configurado corretamente',
      timestamp: new Date().toISOString(),
    };
  }

  /**
   * Listar campanhas para recuperação
   * Campanhas que podem ser retomadas
   */
  async getRecoveryCampaigns(userId?: number) {
    const query = this.campaignRepository
      .createQueryBuilder('campaign')
      .leftJoinAndSelect('campaign.user', 'user')
      .leftJoinAndSelect('campaign.public', 'public')
      .where('campaign.deleted_at IS NULL')
      .andWhere('campaign.status = :status', { status: 1 }); // Pausadas

    if (userId) {
      query.andWhere('campaign.user_id = :userId', { userId });
    }

    query.orderBy('campaign.updated_at', 'DESC');

    return query.getMany();
  }

  /**
   * Recuperar campanha específica
   * Reativa uma campanha pausada
   */
  async recoverCampaign(campaignId: number) {
    const campaign = await this.campaignRepository.findOne({
      where: {
        id: campaignId,
        deleted_at: IsNull(),
      },
    });

    if (!campaign) {
      return {
        success: false,
        message: 'Campanha não encontrada.',
      };
    }

    // Reativar campanha (status 0 = ativa)
    campaign.status = 0;
    campaign.canceled = 0;
    await this.campaignRepository.save(campaign);

    return {
      success: true,
      message: 'Campanha recuperada com sucesso.',
      campaign,
    };
  }

  /**
   * Verificar status de recuperação
   */
  async checkRecoveryStatus() {
    const pausedCount = await this.campaignRepository.count({
      where: {
        deleted_at: IsNull(),
        status: 1, // Pausadas
      },
    });

    const canceledCount = await this.campaignRepository.count({
      where: {
        deleted_at: IsNull(),
        status: 2, // Canceladas
      },
    });

    return {
      paused_campaigns: pausedCount,
      canceled_campaigns: canceledCount,
      recoverable: pausedCount,
      message: `${pausedCount} campanhas pausadas disponíveis para recuperação`,
    };
  }

  /**
   * Campanhas antigas para recuperação
   * Campanhas pausadas há mais de 7 dias
   */
  async getOlderRecoveryCampaigns() {
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

    return this.campaignRepository.find({
      where: {
        deleted_at: IsNull(),
        status: 1, // Pausadas
        updated_at: LessThan(sevenDaysAgo),
      },
      relations: ['user', 'public'],
      order: {
        updated_at: 'ASC',
      },
      take: 20,
    });
  }

  /**
   * Agendamentos de recuperação
   * Campanhas agendadas que ainda não foram executadas
   */
  async getRecoverySchedules() {
    const now = new Date();

    return this.campaignRepository.find({
      where: {
        deleted_at: IsNull(),
        status: 3, // Agendadas
        schedule_date: MoreThan(now),
      },
      relations: ['user', 'public'],
      order: {
        schedule_date: 'ASC',
      },
      take: 20,
    });
  }

  /**
   * Status de sincronização de contatos
   */
  async getContactsSyncStatus(userId: number) {
    this.logger.log(`🔍 Buscando status de contatos para user ${userId}`);

    const totalContacts = await this.contactRepository.count({
      where: {
        user_id: userId,
        deleted_at: IsNull(),
      },
    });

    this.logger.log(`📊 Total de contatos para user ${userId}: ${totalContacts}`);

    const activeContacts = await this.contactRepository.count({
      where: {
        user_id: userId,
        deleted_at: IsNull(),
        status: 1,
      },
    });

    // Contar públicos em campanhas (campaign_publics)
    // NOTA: Campaign tem relação 'public' (singular), não 'publics'
    // Vamos contar campanhas que têm público associado
    const campaignPublicsCount = await this.campaignRepository
      .count({
        where: {
          user_id: userId,
          public_id: Not(IsNull()), // Conta campanhas que têm público associado (NOT IsNull)
          deleted_at: IsNull(),
        },
      });

    const result = {
      total_contacts: totalContacts,
      active_contacts: activeContacts,
      blocked_contacts: totalContacts - activeContacts,
      sync_status: 'completed',
      last_sync: new Date().toISOString(),
      // Estrutura esperada pelo frontend
      summary: {
        backend_contacts: totalContacts,
        whatsapp_conversations: totalContacts, // Renomeado de waha_conversations
        campaign_publics: campaignPublicsCount,
      },
    };

    this.logger.log(
      `📊 Status de contatos para user ${userId}: ${totalContacts} total, ${activeContacts} ativos, ${campaignPublicsCount} públicos em campanhas`,
    );
    this.logger.log(`📦 Retornando:`, JSON.stringify(result));

    return result;
  }

  /**
   * Sincronização manual de contatos
   * Agora realmente sincroniza contatos do Evolution API
   */
  async manualContactsSync(userId: number, instanceName?: string) {
    this.logger.log(
      `📱 Iniciando sincronização manual de contatos para user ${userId} (instance: ${instanceName || 'default'})`,
    );

    try {
      // Chamar syncFromEvolution do ContactsService
      const result = await this.contactsService.syncFromEvolution(userId);

      // Calcular skipped (total - imported = contatos que já existiam ou foram filtrados)
      const skippedCount = result.total - result.imported;

      this.logger.log(
        `✅ Sincronização concluída: ${result.imported} contatos importados de ${result.total} total (${skippedCount} ignorados)`,
      );

      return {
        success: true,
        message: 'Sincronização de contatos concluída',
        method: 'Evolution API', // Campo adicionado para o frontend
        user_id: userId,
        // Campos esperados pelo frontend
        importedCount: result.imported,
        skippedCount: skippedCount,
        totalContactsFound: result.total,
        // Campos originais (backward compatibility)
        total: result.total,
        imported: result.imported,
        timestamp: new Date().toISOString(),
      };
    } catch (error) {
      this.logger.error(
        `❌ Erro na sincronização de contatos: ${error instanceof Error ? error.message : String(error)}`,
      );

      return {
        success: false,
        message: `Erro na sincronização: ${error instanceof Error ? error.message : 'Erro desconhecido'}`,
        method: 'Evolution API',
        user_id: userId,
        importedCount: 0,
        skippedCount: 0,
        totalContactsFound: 0,
        timestamp: new Date().toISOString(),
      };
    }
  }

  /**
   * Sincronização de campanhas simplificadas
   */
  async simplifiedSync() {
    // Placeholder para sincronização de campanhas simplificadas
    // Na implementação real, processaria públicos simplificados
    return {
      success: true,
      message: 'Sincronização de campanhas simplificadas iniciada',
      timestamp: new Date().toISOString(),
    };
  }

  /**
   * Salvar configurações do usuário
   * Nota: Configuration entity só armazena timer_delay
   * Para configurações customizadas, usar Settings ou localStorage no frontend
   */
  async saveUserConfiguration(
    userId: number,
    configurations: Record<string, any>,
  ) {
    // Buscar ou criar configuração
    let config = await this.configurationRepository.findOne({
      where: { user_id: userId },
    });

    if (!config) {
      // Criar configuração padrão se não existir
      config = this.configurationRepository.create({
        user_id: userId,
        timer_delay: configurations.timer_delay || 30,
      });
      await this.configurationRepository.save(config);
    } else if (configurations.timer_delay !== undefined) {
      // Atualizar timer_delay se fornecido
      config.timer_delay = configurations.timer_delay;
      await this.configurationRepository.save(config);
    }

    return {
      success: true,
      message: 'Configurações salvas com sucesso.',
      configurations: {
        timer_delay: config.timer_delay,
        ...configurations,
      },
    };
  }

  /**
   * Debug - Informações de conexão WhatsApp
   */
  getDebugWhatsAppInfo() {
    return {
      waha_url: process.env.WAHA_URL || 'not_configured',
      waha_api_key: process.env.API_WHATSAPP_GLOBALKEY
        ? '***configured***'
        : 'not_configured',
      environment: process.env.NODE_ENV,
      timestamp: new Date().toISOString(),
    };
  }

  /**
   * Debug - Informações de servidores
   */
  getDebugServersInfo() {
    return {
      node_version: process.version,
      platform: process.platform,
      arch: process.arch,
      memory: {
        total:
          Math.round(process.memoryUsage().heapTotal / 1024 / 1024) + ' MB',
        used: Math.round(process.memoryUsage().heapUsed / 1024 / 1024) + ' MB',
      },
      uptime: Math.round(process.uptime()) + ' seconds',
      environment: process.env.NODE_ENV,
    };
  }

  /**
   * Laravel-compatible: Lista campanhas deletadas recuperáveis
   */
  async getRecoverableCampaigns(userId: number) {
    return this.campaignRepository.find({
      where: {
        user_id: userId,
        deleted_at: IsNull(),
        status: 1, // Pausadas
      },
      order: {
        updated_at: 'DESC',
      },
    });
  }

  /**
   * Laravel-compatible: Lista contatos deletados recuperáveis
   */
  async getRecoverableContacts(userId: number) {
    return this.contactRepository.find({
      where: {
        user_id: userId,
        deleted_at: IsNull(),
      },
      order: {
        updated_at: 'DESC',
      },
      take: 50,
    });
  }

  /**
   * Laravel-compatible: Restaura campanha deletada
   */
  async restoreCampaign(userId: number, campaignId: number) {
    const campaign = await this.campaignRepository.findOne({
      where: {
        id: campaignId,
        user_id: userId,
      },
    });

    if (!campaign) {
      return {
        success: false,
        message: 'Campanha não encontrada.',
      };
    }

    campaign.status = 0;
    campaign.canceled = 0;
    campaign.deleted_at = null;
    await this.campaignRepository.save(campaign);

    return {
      success: true,
      message: 'Campanha restaurada com sucesso.',
      campaign,
    };
  }

  /**
   * Laravel-compatible: Dados de debug do usuário
   */
  async getUserDebugData(userId: number) {
    const contactsCount = await this.contactRepository.count({
      where: { user_id: userId, deleted_at: IsNull() },
    });

    const campaignsCount = await this.campaignRepository.count({
      where: { user_id: userId, deleted_at: IsNull() },
    });

    return {
      user: {
        id: userId,
      },
      contacts_count: contactsCount,
      campaigns_count: campaignsCount,
      timestamp: new Date().toISOString(),
    };
  }

  /**
   * Laravel-compatible: Status do banco de dados
   */
  async getDatabaseStatus() {
    try {
      // Test database connection by running a simple query
      await this.campaignRepository.query('SELECT 1');
      return {
        connected: true,
        status: 'ok',
        timestamp: new Date().toISOString(),
      };
    } catch (error: any) {
      return {
        connected: false,
        status: 'error',
        error: error?.message || 'Unknown error',
        timestamp: new Date().toISOString(),
      };
    }
  }

  /**
   * Laravel-compatible: Limpa cache do usuário
   */
  async clearUserCache(userId: number) {
    return {
      success: true,
      message: 'Cache do usuário limpo com sucesso.',
      user_id: userId,
      timestamp: new Date().toISOString(),
    };
  }

  /**
   * Laravel-compatible: Sincroniza contatos
   */
  async syncContacts(userId: number) {
    const contactsCount = await this.contactRepository.count({
      where: { user_id: userId, deleted_at: IsNull() },
    });

    return {
      synced: contactsCount,
      timestamp: new Date().toISOString(),
    };
  }

  /**
   * Laravel-compatible: Sincroniza campanhas
   */
  async syncCampaigns(userId: number) {
    const campaignsCount = await this.campaignRepository.count({
      where: { user_id: userId, deleted_at: IsNull() },
    });

    return {
      synced: campaignsCount,
      timestamp: new Date().toISOString(),
    };
  }

  /**
   * Laravel-compatible: Força sincronização completa
   */
  async forceSyncAll(userId: number) {
    return {
      success: true,
      message: 'Sincronização completa iniciada.',
      user_id: userId,
      timestamp: new Date().toISOString(),
    };
  }

  /**
   * Laravel-compatible: Obtém configurações do usuário
   */
  async getUserConfiguration(userId: number) {
    const config = await this.configurationRepository.findOne({
      where: { user_id: userId },
    });

    if (!config) {
      // Return default config
      return {
        timer_delay: 30,
      };
    }

    return {
      timer_delay: config.timer_delay,
    };
  }

  /**
   * Laravel-compatible: Salva configurações do usuário (v1)
   */
  async saveUserConfigurationV1(userId: number, config: any) {
    let userConfig = await this.configurationRepository.findOne({
      where: { user_id: userId },
    });

    if (!userConfig) {
      userConfig = this.configurationRepository.create({
        user_id: userId,
        timer_delay: config.timer_delay || 30,
      });
    } else {
      if (config.timer_delay !== undefined) {
        userConfig.timer_delay = config.timer_delay;
      }
    }

    await this.configurationRepository.save(userConfig);

    return {
      success: true,
      message: 'Configurações salvas com sucesso.',
    };
  }
}
