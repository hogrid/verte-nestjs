import {
  Body,
  Controller,
  Delete,
  Get,
  Headers,
  HttpCode,
  HttpStatus,
  Param,
  Post,
  Query,
  Request,
  UseGuards,
  Sse,
} from '@nestjs/common';
import { Observable } from 'rxjs';
import { ConfigService } from '@nestjs/config';
import {
  ApiBearerAuth,
  ApiBody,
  ApiOperation,
  ApiParam,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import {
  SendImageMessageDto,
  SendTemplateMessageDto,
  SendTextMessageDto,
} from './dto/send-message.dto';
import { SetupWhatsAppDto } from './dto/setup-whatsapp.dto';
import type { WhatsAppWebhookPayload } from './dto/webhook.dto';
import { WhatsappService } from './whatsapp.service';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Number as WhatsAppNumber } from '../database/entities/number.entity';

/**
 * WhatsappController
 *
 * Gerencia integração WhatsApp via Evolution API
 * Mantém compatibilidade com Laravel WhatsappController (quando possível)
 *
 * **ARQUITETURA DESACOPLADA**:
 * - Usa IWhatsAppProvider interface
 * - Fácil trocar entre providers (Evolution API, WAHA, Cloud API, etc)
 * - Provider atual: Evolution API v2
 *
 * **Evolution API**:
 * - ✅ Múltiplas instâncias (cada usuário com seu WhatsApp)
 * - ✅ Conexão via QR Code
 * - ✅ Open-source e auto-hospedável
 *
 * Total: 11 endpoints principais (adicionado GET /whatsapp/qrcode/:number)
 */
@ApiTags('WhatsApp (Evolution API)')
@Controller('api/v1')
export class WhatsappController {
  constructor(
    private readonly whatsappService: WhatsappService,
    private readonly configService: ConfigService,
    @InjectRepository(WhatsAppNumber)
    private readonly numberRepository: Repository<WhatsAppNumber>,
  ) {}

  /**
   * 1. POST /api/v1/whatsapp/setup
   * Configurar WhatsApp via Evolution API (com QR Code)
   */
  @Post('whatsapp/setup')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth('JWT-auth')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Configurar WhatsApp via Evolution API',
    description:
      'Cria uma instância WhatsApp e gera QR Code para conexão. Cada usuário pode ter múltiplas instâncias.',
  })
  @ApiBody({ type: SetupWhatsAppDto })
  @ApiResponse({
    status: 200,
    description: 'Instância criada e QR Code gerado',
    schema: {
      example: {
        success: true,
        message:
          'WhatsApp configurado. Escaneie o QR Code para conectar seu número.',
        number: {
          id: 1,
          name: 'WhatsApp Principal',
          instance_name: 'user_123_whatsapp',
          qr_code: 'data:image/png;base64,...',
          status: 'qr',
        },
      },
    },
  })
  @ApiResponse({ status: 401, description: 'Não autorizado' })
  @ApiResponse({
    status: 400,
    description: 'Erro ao criar instância',
  })
  async setupWhatsApp(
    @Request() req: { user: { id: number } },
    @Body() dto: SetupWhatsAppDto,
  ) {
    return this.whatsappService.setupWhatsApp(req.user.id, dto);
  }

  /**
   * 1.5. GET /api/v1/whatsapp/qrcode/:number
   * Obter QR Code para conectar (novo endpoint)
   */
  @Get('whatsapp/qrcode/:number')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({
    summary: 'Obter QR Code',
    description: 'Obtém QR Code atualizado para conectar WhatsApp',
  })
  @ApiParam({
    name: 'number',
    description: 'ID do número',
    example: 1,
  })
  @ApiResponse({
    status: 200,
    description: 'QR Code obtido',
    schema: {
      example: {
        success: true,
        qr_code: 'data:image/png;base64,...',
        instance_name: 'user_123_whatsapp',
      },
    },
  })
  @ApiResponse({ status: 401, description: 'Não autorizado' })
  @ApiResponse({ status: 404, description: 'Número não encontrado' })
  async getQRCode(
    @Request() req: { user: { id: number } },
    @Param('number') numberId: number,
  ) {
    return this.whatsappService.getQRCode(req.user.id, numberId);
  }

  @Get('test-setup')
  async testSetup() {
    return this.whatsappService.setupWhatsApp(1, {
      instanceName: 'test_debug_qr_' + Date.now(),
      name: 'Test Debug',
    });
  }

  /**
   * 2. GET /api/v1/whatsapp/status
   * Verificar status de conexão WhatsApp
   */
  @Get('whatsapp/status')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({
    summary: 'Verificar conexão WhatsApp',
    description: 'Verifica se o WhatsApp está configurado e conectado',
  })
  @ApiResponse({
    status: 200,
    description: 'Status verificado com sucesso',
    schema: {
      example: {
        connected: true,
        phone_number: '+5511999999999',
        verified_name: 'Minha Empresa',
        quality_rating: 'GREEN',
      },
    },
  })
  @ApiResponse({ status: 401, description: 'Não autorizado' })
  async checkStatus(@Request() req: { user: { id: number } }) {
    return this.whatsappService.checkConnection(req.user.id);
  }

  @Get('whatsapp/me')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({ summary: 'Dados do perfil WhatsApp (nome, foto, número)' })
  @ApiResponse({ status: 200, description: 'Perfil retornado' })
  async getMe(@Request() req: { user: { id: number } }) {
    return this.whatsappService.getProfileInfo(req.user.id);
  }

  /**
   * Compat: GET /api/v1/connect-whatsapp
   */
  @Get('connect-whatsapp')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({ summary: 'Compat: iniciar conexão WhatsApp' })
  @ApiResponse({ status: 200 })
  async connectWhatsApp(@Request() req: { user: { id: number } }) {
    const status = await this.whatsappService.checkConnection(req.user.id);
    if (!status.connected) {
      const number = await this.numberRepository.findOne({
        where: { user_id: req.user.id, status: 1 },
      });
      let ensured = number;
      if (!ensured) {
        ensured = this.numberRepository.create({
          user_id: req.user.id,
          name: 'WhatsApp Principal',
          instance: `user_${req.user.id}_whatsapp`,
          status: 1,
          status_connection: 0,
        });
        ensured = await this.numberRepository.save(ensured);
      }
      return {
        qr: status.status === 'qr' ? true : false,
        connected: false,
        instance: ensured.instance,
        number_id: ensured.id,
      };
    }
    return { connected: true };
  }

  /**
   * Compat: GET /api/v1/connect-whatsapp-check
   */
  @Get('connect-whatsapp-check')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({ summary: 'Compat: checar conexão WhatsApp' })
  @ApiResponse({ status: 200 })
  async connectWhatsAppCheck(@Request() req: { user: { id: number } }) {
    return this.whatsappService.checkConnection(req.user.id);
  }

  @Sse('whatsapp/status/stream')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth('JWT-auth')
  sseStatus(@Request() req: { user: { id: number } }): Observable<{
    instanceName: string;
    status: 'connected' | 'disconnected';
  }> {
    return this.whatsappService.onStatusForUser(req.user.id);
  }

  /**
   * Compat: POST /api/v1/force-check-whatsapp-connections
   */
  @Post('force-check-whatsapp-connections')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth('JWT-auth')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Compat: forçar checagem de conexões WhatsApp' })
  @ApiResponse({ status: 200 })
  async forceCheckConnections() {
    return { checked: true, results: [] };
  }

  /**
   * 3. POST /api/v1/whatsapp/send-text
   * Enviar mensagem de texto
   */
  @Post('whatsapp/send-text')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth('JWT-auth')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Enviar mensagem de texto',
    description: 'Envia mensagem de texto via WhatsApp Cloud API',
  })
  @ApiBody({ type: SendTextMessageDto })
  @ApiResponse({
    status: 200,
    description: 'Mensagem enviada com sucesso',
    schema: {
      example: {
        success: true,
        message_id: 'wamid.HBgNNjE1NTU1MTIzNDU...',
      },
    },
  })
  @ApiResponse({ status: 401, description: 'Não autorizado' })
  @ApiResponse({ status: 404, description: 'Número não encontrado' })
  async sendTextMessage(
    @Request() req: { user: { id: number } },
    @Body() dto: SendTextMessageDto,
  ) {
    return this.whatsappService.sendTextMessage(req.user.id, dto);
  }

  /**
   * 4. POST /api/v1/whatsapp/send-template
   * Enviar mensagem template
   */
  @Post('whatsapp/send-template')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth('JWT-auth')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Enviar mensagem template',
    description:
      'Envia mensagem template aprovada via WhatsApp Cloud API (necessário para iniciar conversa)',
  })
  @ApiBody({ type: SendTemplateMessageDto })
  @ApiResponse({
    status: 200,
    description: 'Template enviado com sucesso',
    schema: {
      example: {
        success: true,
        message_id: 'wamid.HBgNNjE1NTU1MTIzNDU...',
      },
    },
  })
  @ApiResponse({ status: 401, description: 'Não autorizado' })
  @ApiResponse({ status: 404, description: 'Número não encontrado' })
  async sendTemplateMessage(
    @Request() req: { user: { id: number } },
    @Body() dto: SendTemplateMessageDto,
  ) {
    return this.whatsappService.sendTemplateMessage(req.user.id, dto);
  }

  /**
   * 5. POST /api/v1/whatsapp/send-image
   * Enviar mensagem com imagem
   */
  @Post('whatsapp/send-image')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth('JWT-auth')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Enviar mensagem com imagem',
    description: 'Envia mensagem com imagem via WhatsApp Cloud API',
  })
  @ApiBody({ type: SendImageMessageDto })
  @ApiResponse({
    status: 200,
    description: 'Imagem enviada com sucesso',
    schema: {
      example: {
        success: true,
        message_id: 'wamid.HBgNNjE1NTU1MTIzNDU...',
      },
    },
  })
  @ApiResponse({ status: 401, description: 'Não autorizado' })
  @ApiResponse({ status: 404, description: 'Número não encontrado' })
  async sendImageMessage(
    @Request() req: { user: { id: number } },
    @Body() dto: SendImageMessageDto,
  ) {
    return this.whatsappService.sendImageMessage(req.user.id, dto);
  }

  @Post('whatsapp/disconnect')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth('JWT-auth')
  @HttpCode(HttpStatus.OK)
  async disconnect(@Request() req: { user: { id: number } }) {
    return this.whatsappService.disconnect(req.user.id);
  }

  /**
   * 6. GET /api/v1/numbers
   * Listar números WhatsApp do usuário
   */
  @Get('numbers')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({
    summary: 'Listar números WhatsApp',
    description: 'Lista todos os números WhatsApp configurados pelo usuário',
  })
  @ApiResponse({
    status: 200,
    description: 'Lista de números',
    schema: {
      example: {
        data: [
          {
            id: 1,
            name: 'WhatsApp Principal',
            phone_number: '+5511999999999',
            status: 1,
            status_connection: 1,
            created_at: '2024-01-01T00:00:00.000Z',
          },
        ],
        count: 1,
      },
    },
  })
  @ApiResponse({ status: 401, description: 'Não autorizado' })
  async listNumbers(@Request() req: { user: { id: number } }) {
    return this.whatsappService.listNumbers(req.user.id);
  }

  /**
   * 7. GET /api/v1/numbers/:number
   * Mostrar detalhes de número WhatsApp
   */
  @Get('numbers/:number')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({
    summary: 'Mostrar número WhatsApp',
    description: 'Mostra detalhes de número WhatsApp específico',
  })
  @ApiParam({
    name: 'number',
    description: 'ID do número',
    example: 1,
  })
  @ApiResponse({
    status: 200,
    description: 'Detalhes do número',
    schema: {
      example: {
        data: {
          id: 1,
          name: 'WhatsApp Principal',
          phone_number: '+5511999999999',
          status: 1,
          status_connection: 1,
          created_at: '2024-01-01T00:00:00.000Z',
          updated_at: '2024-01-01T00:00:00.000Z',
        },
      },
    },
  })
  @ApiResponse({ status: 401, description: 'Não autorizado' })
  @ApiResponse({ status: 404, description: 'Número não encontrado' })
  async showNumber(
    @Request() req: { user: { id: number } },
    @Param('number') numberId: number,
  ) {
    return this.whatsappService.showNumber(req.user.id, numberId);
  }

  /**
   * 8. DELETE /api/v1/numbers/:number
   * Remover número WhatsApp
   */
  @Delete('numbers/:number')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({
    summary: 'Remover número WhatsApp',
    description: 'Remove número WhatsApp do usuário (soft delete)',
  })
  @ApiParam({
    name: 'number',
    description: 'ID do número',
    example: 1,
  })
  @ApiResponse({
    status: 200,
    description: 'Número removido',
    schema: {
      example: {
        success: true,
        message: 'Número removido com sucesso',
      },
    },
  })
  @ApiResponse({ status: 401, description: 'Não autorizado' })
  @ApiResponse({ status: 404, description: 'Número não encontrado' })
  async removeNumber(
    @Request() req: { user: { id: number } },
    @Param('number') numberId: number,
  ) {
    return this.whatsappService.removeNumber(req.user.id, numberId);
  }

  /**
   * 9. GET /api/v1/whatsapp/webhook (Verification)
   * Verificação de webhook do WhatsApp Cloud API
   * https://developers.facebook.com/docs/graph-api/webhooks/getting-started
   */
  @Get('whatsapp/webhook')
  @ApiOperation({
    summary: 'Verificação de webhook WhatsApp',
    description:
      'Endpoint de verificação do webhook (chamado pela Meta ao configurar webhook)',
  })
  @ApiResponse({
    status: 200,
    description: 'Verificação bem-sucedida',
  })
  async verifyWebhook(
    @Query('hub.mode') mode: string,
    @Query('hub.verify_token') token: string,
    @Query('hub.challenge') challenge: string,
  ) {
    const verifyToken = this.configService.get<string>(
      'WHATSAPP_WEBHOOK_VERIFY_TOKEN',
      'verte_webhook_token_2024',
    );

    if (mode === 'subscribe' && token === verifyToken) {
      console.log('✅ Webhook verified successfully');
      return challenge;
    } else {
      console.log('❌ Webhook verification failed');
      return 'Verification failed';
    }
  }

  /**
   * 10. POST /api/v1/whatsapp/webhook
   * Receber eventos do WhatsApp Cloud API
   */
  @Post('whatsapp/webhook')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Webhook WhatsApp Cloud API',
    description:
      'Recebe eventos do WhatsApp (mensagens recebidas, status, etc)',
  })
  @ApiBody({
    description: 'Payload do webhook WhatsApp Cloud API',
    schema: {
      type: 'object',
      properties: {
        object: { type: 'string', example: 'whatsapp_business_account' },
        entry: { type: 'array' },
      },
    },
  })
  @ApiResponse({
    status: 200,
    description: 'Webhook processado',
    schema: {
      example: {
        success: true,
        message: 'Webhook processado',
      },
    },
  })
  async handleWebhook(
    @Body() payload: WhatsAppWebhookPayload,
    @Headers('x-hub-signature-256') signature: string,
  ) {
    // TODO: Validar assinatura do webhook para segurança
    // const appSecret = this.configService.get<string>('WHATSAPP_APP_SECRET');
    // this.whatsappCloudService.validateWebhookSignature(JSON.stringify(payload), signature, appSecret);

    return this.whatsappService.handleWebhook(payload);
  }
}
