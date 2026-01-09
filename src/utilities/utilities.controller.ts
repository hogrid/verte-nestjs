import {
  Controller,
  Get,
  Post,
  Param,
  Body,
  Request,
  UseGuards,
  HttpCode,
  Inject,
  Optional,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiParam,
  ApiBody,
} from '@nestjs/swagger';
import { InjectQueue } from '@nestjs/bull';
import type { Queue } from 'bull';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { UtilitiesService } from './utilities.service';
import { SyncContactsDto } from './dto/sync-contacts.dto';
import { QUEUE_NAMES } from '../config/redis.config';

/**
 * UtilitiesController
 *
 * Endpoints utilitários:
 * - Health checks
 * - CORS testing
 * - Campaign recovery
 * - Debug tools
 * - Synchronization
 *
 * Total: 17 endpoints
 */
@ApiTags('Utilities')
@Controller('api')
export class UtilitiesController {
  constructor(
    private readonly utilitiesService: UtilitiesService,
    @Optional()
    @InjectQueue(QUEUE_NAMES.CAMPAIGNS)
    private readonly campaignsQueue?: Queue,
    @Optional()
    @InjectQueue(QUEUE_NAMES.WHATSAPP_MESSAGE)
    private readonly whatsappMessageQueue?: Queue,
  ) {}

  /**
   * 1. GET /api/health (backward compatibility)
   * Health check da aplicação
   */
  @Get('health')
  @ApiOperation({
    summary: 'Health check',
    description: 'Verifica status da aplicação (uptime, ambiente, etc)',
  })
  @ApiResponse({
    status: 200,
    description: 'Aplicação saudável',
    schema: {
      example: {
        status: 'ok',
        timestamp: '2024-01-01T00:00:00.000Z',
        uptime: 3600,
        environment: 'production',
      },
    },
  })
  getHealth() {
    return this.utilitiesService.getHealth();
  }

  /**
   * 1b. GET /api/v1/health
   * Health check da aplicação (Laravel-compatible)
   */
  @Get('v1/health')
  @ApiOperation({
    summary: 'Health check (v1)',
    description: 'Verifica status da aplicação (Laravel-compatible)',
  })
  @ApiResponse({ status: 200, description: 'Aplicação saudável' })
  getHealthV1() {
    return this.utilitiesService.getHealth();
  }

  /**
   * 2. GET /api/v1/cors-test
   * Teste de configuração CORS
   */
  @Get('v1/cors-test')
  @ApiOperation({
    summary: 'Teste CORS',
    description: 'Testa configuração de CORS da API',
  })
  @ApiResponse({ status: 200, description: 'CORS configurado corretamente' })
  testCors() {
    return this.utilitiesService.testCors();
  }

  /**
   * Laravel-compatible Recovery Endpoints
   */
  @Get('v1/recovery/campaigns')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({
    summary: 'Recuperar campanhas',
    description: 'Lista campanhas deletadas recuperáveis',
  })
  @ApiResponse({ status: 200, description: 'Campanhas listadas' })
  async getRecoverableCampaigns(@Request() req: { user: { id: number } }) {
    return this.utilitiesService.getRecoverableCampaigns(req.user.id);
  }

  @Get('v1/recovery/contacts')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({
    summary: 'Recuperar contatos',
    description: 'Lista contatos deletados recuperáveis',
  })
  @ApiResponse({ status: 200, description: 'Contatos listados' })
  async getRecoverableContacts(@Request() req: { user: { id: number } }) {
    return this.utilitiesService.getRecoverableContacts(req.user.id);
  }

  @Post('v1/recovery/restore-campaign')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({
    summary: 'Restaurar campanha',
    description: 'Restaura uma campanha deletada',
  })
  @ApiResponse({ status: 200, description: 'Campanha restaurada' })
  @ApiResponse({ status: 404, description: 'Campanha não encontrada' })
  @HttpCode(200)
  async restoreCampaign(
    @Request() req: { user: { id: number } },
    @Body('campaign_id') campaignId: number,
  ) {
    return this.utilitiesService.restoreCampaign(req.user.id, campaignId);
  }

  /**
   * Laravel-compatible Debug Endpoints
   */
  @Post('v1/debug/user-data')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({
    summary: 'Dados de debug do usuário',
    description: 'Retorna informações de debug do usuário',
  })
  @ApiResponse({ status: 200, description: 'Dados retornados' })
  @HttpCode(200)
  async getUserDebugData(@Request() req: { user: { id: number } }) {
    return this.utilitiesService.getUserDebugData(req.user.id);
  }

  @Get('v1/debug/database-status')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({
    summary: 'Status do banco de dados',
    description: 'Verifica conexão com banco de dados',
  })
  @ApiResponse({ status: 200, description: 'Status retornado' })
  async getDatabaseStatus() {
    return this.utilitiesService.getDatabaseStatus();
  }

  @Post('v1/debug/clear-user-cache')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({
    summary: 'Limpar cache do usuário',
    description: 'Limpa cache e dados temporários do usuário',
  })
  @ApiResponse({ status: 200, description: 'Cache limpo' })
  @HttpCode(200)
  async clearUserCache(@Request() req: { user: { id: number } }) {
    return this.utilitiesService.clearUserCache(req.user.id);
  }

  /**
   * Laravel-compatible Sync Endpoints
   */
  @Get('v1/sync/contacts')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({
    summary: 'Sincronizar contatos',
    description: 'Sincroniza contatos do usuário',
  })
  @ApiResponse({ status: 200, description: 'Sincronização concluída' })
  async syncContacts(@Request() req: { user: { id: number } }) {
    return this.utilitiesService.syncContacts(req.user.id);
  }

  @Get('v1/sync/campaigns')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({
    summary: 'Sincronizar campanhas',
    description: 'Sincroniza campanhas do usuário',
  })
  @ApiResponse({ status: 200, description: 'Sincronização concluída' })
  async syncCampaigns(@Request() req: { user: { id: number } }) {
    return this.utilitiesService.syncCampaigns(req.user.id);
  }

  @Post('v1/sync/force-sync-all')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({
    summary: 'Forçar sincronização completa',
    description: 'Força sincronização de todos os dados do usuário',
  })
  @ApiResponse({ status: 200, description: 'Sincronização forçada' })
  @HttpCode(200)
  async forceSyncAll(@Request() req: { user: { id: number } }) {
    return this.utilitiesService.forceSyncAll(req.user.id);
  }

  /**
   * Laravel-compatible User Configuration Endpoints
   */
  @Get('v1/user-configuration')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({
    summary: 'Obter configurações do usuário',
    description: 'Retorna configurações personalizadas do usuário',
  })
  @ApiResponse({ status: 200, description: 'Configurações retornadas' })
  async getUserConfiguration(@Request() req: { user: { id: number } }) {
    return this.utilitiesService.getUserConfiguration(req.user.id);
  }

  @Post('v1/user-configuration')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({
    summary: 'Salvar configurações do usuário',
    description: 'Salva configurações personalizadas do usuário',
  })
  @ApiResponse({ status: 200, description: 'Configurações salvas' })
  @HttpCode(200)
  async saveUserConfigurationV1(
    @Request() req: { user: { id: number } },
    @Body() config: any,
  ) {
    return this.utilitiesService.saveUserConfigurationV1(req.user.id, config);
  }

  /**
   * 3. GET /api/v1/recovery-campaigns
   * Listar campanhas para recuperação
   */
  @Get('v1/recovery-campaigns')
  @ApiOperation({
    summary: 'Campanhas para recuperação',
    description: 'Lista campanhas pausadas que podem ser recuperadas',
  })
  @ApiResponse({ status: 200, description: 'Campanhas listadas' })
  async getRecoveryCampaigns() {
    return this.utilitiesService.getRecoveryCampaigns();
  }

  /**
   * 4. GET /api/v1/recovery-campaign/:campaign
   * Recuperar campanha específica
   */
  @Get('v1/recovery-campaign/:campaign')
  @ApiOperation({
    summary: 'Recuperar campanha',
    description: 'Reativa uma campanha pausada',
  })
  @ApiParam({ name: 'campaign', description: 'ID da campanha', example: 1 })
  @ApiResponse({ status: 200, description: 'Campanha recuperada' })
  @ApiResponse({ status: 404, description: 'Campanha não encontrada' })
  async recoverCampaign(@Param('campaign') campaignId: number) {
    return this.utilitiesService.recoverCampaign(campaignId);
  }

  /**
   * 5. GET /api/v1/recovery-campaigns-check
   * Verificar status de recuperação
   */
  @Get('v1/recovery-campaigns-check')
  @ApiOperation({
    summary: 'Status de recuperação',
    description: 'Retorna quantidade de campanhas pausadas e canceladas',
  })
  @ApiResponse({
    status: 200,
    description: 'Status carregado',
    schema: {
      example: {
        paused_campaigns: 5,
        canceled_campaigns: 3,
        recoverable: 5,
        message: '5 campanhas pausadas disponíveis para recuperação',
      },
    },
  })
  async checkRecoveryStatus() {
    return this.utilitiesService.checkRecoveryStatus();
  }

  /**
   * 6. GET /api/v1/recovery-campaigns-olders
   * Campanhas antigas para recuperação
   */
  @Get('v1/recovery-campaigns-olders')
  @ApiOperation({
    summary: 'Campanhas antigas',
    description: 'Lista campanhas pausadas há mais de 7 dias',
  })
  @ApiResponse({ status: 200, description: 'Campanhas antigas listadas' })
  async getOlderRecoveryCampaigns() {
    return this.utilitiesService.getOlderRecoveryCampaigns();
  }

  /**
   * 7. GET /api/v1/recovery-campaigns-schedules
   * Agendamentos de recuperação
   */
  @Get('v1/recovery-campaigns-schedules')
  @ApiOperation({
    summary: 'Agendamentos de recuperação',
    description: 'Lista campanhas agendadas que ainda não foram executadas',
  })
  @ApiResponse({ status: 200, description: 'Agendamentos listados' })
  async getRecoverySchedules() {
    return this.utilitiesService.getRecoverySchedules();
  }

  /**
   * 8. GET /api/v1/test-check-whatsapp-realtime
   * Teste público de conexão WhatsApp
   */
  @Get('v1/test-check-whatsapp-realtime')
  @ApiOperation({
    summary: 'Teste WhatsApp realtime',
    description: 'Endpoint público para teste de conexão WhatsApp',
  })
  @ApiResponse({ status: 200, description: 'Teste executado' })
  testWhatsAppRealtime() {
    return {
      success: true,
      message: 'Teste de conexão WhatsApp realtime',
      timestamp: new Date().toISOString(),
    };
  }

  /**
   * 9. GET /api/v1/debug-connect-whatsapp
   * Debug de conexão WhatsApp
   */
  @Get('v1/debug-connect-whatsapp')
  @ApiOperation({
    summary: 'Debug conexão WhatsApp',
    description: 'Informações de debug sobre conexão WhatsApp',
  })
  @ApiResponse({ status: 200, description: 'Debug info retornado' })
  debugConnectWhatsApp() {
    return this.utilitiesService.getDebugWhatsAppInfo();
  }

  /**
   * 10. GET /api/v1/debug-evolution-api
   * Debug da Evolution API
   */
  @Get('v1/debug-evolution-api')
  @ApiOperation({
    summary: 'Debug Evolution API',
    description: 'Informações de debug da Evolution API',
  })
  @ApiResponse({ status: 200, description: 'Debug info retornado' })
  debugEvolutionApi() {
    return {
      evolution_api: 'deprecated',
      message: 'Sistema migrado para WAHA API',
      timestamp: new Date().toISOString(),
    };
  }

  /**
   * 11. GET /api/v1/debug-servers
   * Debug de servidores
   */
  @Get('v1/debug-servers')
  @ApiOperation({
    summary: 'Debug servidores',
    description: 'Informações sobre servidor Node.js',
  })
  @ApiResponse({ status: 200, description: 'Server info retornado' })
  debugServers() {
    return this.utilitiesService.getDebugServersInfo();
  }

  /**
   * 12. GET /api/v1/test-qrcode
   * Teste de geração QR Code
   */
  @Get('v1/test-qrcode')
  @ApiOperation({
    summary: 'Teste QR Code',
    description: 'Gera QR Code de teste',
  })
  @ApiResponse({ status: 200, description: 'QR Code gerado' })
  testQrCode() {
    return {
      success: true,
      qrcode: 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAUA...',
      message: 'QR Code de teste gerado',
    };
  }

  /**
   * 13. GET /api/v1/test-qrcode-fixed
   * Teste de QR Code corrigido
   */
  @Get('v1/test-qrcode-fixed')
  @ApiOperation({
    summary: 'Teste QR Code fixed',
    description: 'Versão corrigida do teste de QR Code',
  })
  @ApiResponse({ status: 200, description: 'QR Code gerado' })
  testQrCodeFixed() {
    return {
      success: true,
      qrcode: 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAUA...',
      message: 'QR Code fixed gerado',
      fixed: true,
    };
  }

  /**
   * 14. GET /api/v1/test-evolution-connection
   * Teste de conexão Evolution API
   */
  @Get('v1/test-evolution-connection')
  @ApiOperation({
    summary: 'Teste Evolution connection',
    description: 'Testa conexão com Evolution API',
  })
  @ApiResponse({ status: 200, description: 'Teste executado' })
  testEvolutionConnection() {
    return {
      success: false,
      message: 'Evolution API deprecated - usando WAHA API',
      waha_configured: !!process.env.WAHA_URL,
    };
  }

  /**
   * 15. POST /api/v1/test-cloud-api-public
   * Teste público da Cloud API
   */
  @Post('v1/test-cloud-api-public')
  @ApiOperation({
    summary: 'Teste Cloud API',
    description: 'Endpoint público para teste da Cloud API',
  })
  @ApiResponse({ status: 200, description: 'Teste executado' })
  testCloudApiPublic() {
    return {
      success: true,
      message: 'Cloud API test endpoint',
      timestamp: new Date().toISOString(),
    };
  }

  /**
   * 16. POST /api/v1/sync-contacts-manual
   * Sincronização manual de contatos
   */
  @Post('v1/sync-contacts-manual')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({
    summary: 'Sincronização manual',
    description: 'Inicia sincronização manual de contatos do Evolution API',
  })
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        instanceName: {
          type: 'string',
          description: 'Nome da instância WhatsApp para sincronizar contatos',
        },
      },
      required: ['instanceName'],
    },
  })
  @ApiResponse({ status: 200, description: 'Sincronização iniciada' })
  @ApiResponse({ status: 401, description: 'Não autorizado' })
  async manualContactsSync(
    @Request() req: { user: { id: number } },
    @Body() syncDto: SyncContactsDto,
  ) {
    return this.utilitiesService.manualContactsSync(
      req.user.id,
      syncDto.instanceName,
    );
  }

  /**
   * 17. GET /api/v1/contacts-sync-status
   * Status de sincronização de contatos
   */
  @Get('v1/contacts-sync-status')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({
    summary: 'Status sincronização',
    description: 'Retorna status de sincronização de contatos',
  })
  @ApiResponse({ status: 200, description: 'Status retornado' })
  @ApiResponse({ status: 401, description: 'Não autorizado' })
  async getContactsSyncStatus(@Request() req: { user: { id: number } }) {
    return this.utilitiesService.getContactsSyncStatus(req.user.id);
  }

  /**
   * 18. GET /api/v1/sync-simplicados
   * Sincronização de campanhas simplificadas
   */
  @Get('v1/sync-simplicados')
  @ApiOperation({
    summary: 'Sync campanhas simplificadas',
    description: 'Sincroniza campanhas simplificadas',
  })
  @ApiResponse({ status: 200, description: 'Sincronização iniciada' })
  async simplifiedSync() {
    return this.utilitiesService.simplifiedSync();
  }

  /**
   * 19. POST /api/v1/configuration/save
   * Salvar configurações do usuário
   */
  @Post('v1/configuration/save')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({
    summary: 'Salvar configurações',
    description: 'Salva configurações personalizadas do usuário',
  })
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        configurations: {
          type: 'object',
          description: 'Objeto com configurações customizadas',
          example: { theme: 'dark', language: 'pt-BR' },
        },
      },
    },
  })
  @ApiResponse({ status: 200, description: 'Configurações salvas' })
  @ApiResponse({ status: 401, description: 'Não autorizado' })
  async saveConfiguration(
    @Request() req: { user: { id: number } },
    @Body('configurations') configurations: Record<string, any>,
  ) {
    return this.utilitiesService.saveUserConfiguration(
      req.user.id,
      configurations,
    );
  }

  /**
   * 20. GET /api/v1/queue-status
   * Status das filas Bull/Redis
   */
  @Get('v1/queue-status')
  @ApiOperation({
    summary: 'Status das filas',
    description: 'Retorna status das filas Bull (campaigns, whatsapp-message)',
  })
  @ApiResponse({
    status: 200,
    description: 'Status das filas',
    schema: {
      example: {
        redis_connected: true,
        queues: {
          campaigns: { waiting: 0, active: 0, completed: 10, failed: 0 },
          'whatsapp-message': { waiting: 5, active: 2, completed: 100, failed: 3 },
        },
      },
    },
  })
  async getQueueStatus() {
    const queuesAvailable = !!this.campaignsQueue && !!this.whatsappMessageQueue;

    if (!queuesAvailable) {
      return {
        redis_connected: false,
        message: 'Queues não disponíveis - Redis pode estar offline ou MOCK_BULL=1',
        timestamp: new Date().toISOString(),
      };
    }

    try {
      const [campaignsStatus, messagesStatus] = await Promise.all([
        this.campaignsQueue!.getJobCounts(),
        this.whatsappMessageQueue!.getJobCounts(),
      ]);

      // Tentar buscar jobs ativos para mais detalhes
      const [activeJobs, waitingJobs] = await Promise.all([
        this.campaignsQueue!.getActive(),
        this.campaignsQueue!.getWaiting(),
      ]);

      return {
        redis_connected: true,
        timestamp: new Date().toISOString(),
        queues: {
          campaigns: {
            ...campaignsStatus,
            active_jobs: activeJobs.map((j) => ({
              id: j.id,
              data: j.data,
              attemptsMade: j.attemptsMade,
              timestamp: j.timestamp,
            })),
            waiting_jobs: waitingJobs.slice(0, 5).map((j) => ({
              id: j.id,
              data: j.data,
              delay: j.opts?.delay,
            })),
          },
          'whatsapp-message': messagesStatus,
        },
      };
    } catch (error) {
      return {
        redis_connected: false,
        error: error instanceof Error ? error.message : String(error),
        message: 'Erro ao conectar com Redis',
        timestamp: new Date().toISOString(),
      };
    }
  }

  /**
   * 21. POST /api/v1/queue-retry-campaign/:id
   * Reprocessar campanha manualmente
   */
  @Post('v1/queue-retry-campaign/:id')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({
    summary: 'Reprocessar campanha',
    description: 'Adiciona campanha à fila para reprocessamento',
  })
  @ApiParam({ name: 'id', description: 'ID da campanha', example: 1 })
  @ApiResponse({ status: 200, description: 'Campanha enfileirada' })
  @HttpCode(200)
  async retryCampaign(
    @Param('id') campaignId: number,
    @Request() req: { user: { id: number } },
  ) {
    if (!this.campaignsQueue) {
      return {
        success: false,
        message: 'Fila de campanhas não disponível',
      };
    }

    try {
      const job = await this.campaignsQueue.add(
        'process-campaign',
        { campaignId: Number(campaignId), userId: req.user.id },
        { attempts: 3, backoff: { type: 'exponential', delay: 5000 } },
      );

      return {
        success: true,
        message: `Campanha #${campaignId} enfileirada para processamento`,
        jobId: job.id,
        timestamp: new Date().toISOString(),
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : String(error),
      };
    }
  }
}
