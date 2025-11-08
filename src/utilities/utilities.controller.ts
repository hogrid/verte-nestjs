import {
  Controller,
  Get,
  Post,
  Param,
  Body,
  Request,
  UseGuards,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiParam,
  ApiBody,
} from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { UtilitiesService } from './utilities.service';

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
  constructor(private readonly utilitiesService: UtilitiesService) {}

  /**
   * 1. GET /api/health
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
    description: 'Inicia sincronização manual de contatos',
  })
  @ApiResponse({ status: 200, description: 'Sincronização iniciada' })
  @ApiResponse({ status: 401, description: 'Não autorizado' })
  async manualContactsSync(@Request() req: { user: { id: number } }) {
    return this.utilitiesService.manualContactsSync(req.user.id);
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
    return this.utilitiesService.saveUserConfiguration(req.user.id, configurations);
  }
}
