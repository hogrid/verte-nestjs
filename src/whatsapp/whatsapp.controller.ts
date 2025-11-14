import {
  Controller,
  Get,
  Post,
  Delete,
  Body,
  Param,
  UseGuards,
  Request,
  HttpCode,
  HttpStatus,
  Query,
  Headers,
  RawBodyRequest,
  Req,
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
import { WhatsappService } from './whatsapp.service';
import { SetupWhatsAppDto } from './dto/setup-whatsapp.dto';
import {
  SendTextMessageDto,
  SendTemplateMessageDto,
  SendImageMessageDto,
} from './dto/send-message.dto';
import type { WhatsAppWebhookPayload } from './dto/webhook.dto';
import { ConfigService } from '@nestjs/config';

/**
 * WhatsappController
 *
 * Gerencia integração WhatsApp via WhatsApp Cloud API (Meta/Facebook)
 * Mantém 100% de compatibilidade com Laravel WhatsappController (quando possível)
 *
 * **MUDANÇA IMPORTANTE**: Não usa mais WAHA (QR Code)
 * Agora usa WhatsApp Cloud API oficial da Meta
 *
 * Total: 10 endpoints principais
 */
@ApiTags('WhatsApp Cloud API')
@Controller('api/v1')
export class WhatsappController {
  constructor(
    private readonly whatsappService: WhatsappService,
    private readonly configService: ConfigService,
  ) {}

  /**
   * 1. POST /api/v1/whatsapp/setup
   * Configurar WhatsApp Cloud API (substitui o antigo connect com QR Code)
   */
  @Post('whatsapp/setup')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth('JWT-auth')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Configurar WhatsApp Cloud API',
    description:
      'Configura WhatsApp usando Phone Number ID e Access Token da Meta. Não usa mais QR Code.',
  })
  @ApiBody({ type: SetupWhatsAppDto })
  @ApiResponse({
    status: 200,
    description: 'WhatsApp configurado com sucesso',
    schema: {
      example: {
        success: true,
        message: 'WhatsApp configurado com sucesso',
        number: {
          id: 1,
          name: 'WhatsApp Principal',
          phone_number: '+5511999999999',
          verified_name: 'Minha Empresa',
          quality_rating: 'GREEN',
        },
      },
    },
  })
  @ApiResponse({ status: 401, description: 'Não autorizado' })
  @ApiResponse({
    status: 400,
    description: 'Phone Number ID ou Access Token inválidos',
  })
  async setupWhatsApp(
    @Request() req: { user: { id: number } },
    @Body() dto: SetupWhatsAppDto,
  ) {
    return this.whatsappService.setupWhatsApp(req.user.id, dto);
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
    description: 'Recebe eventos do WhatsApp (mensagens recebidas, status, etc)',
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
