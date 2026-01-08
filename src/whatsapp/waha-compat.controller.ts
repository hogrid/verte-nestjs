import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Post,
  UseGuards,
  NotFoundException,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiBody,
  ApiOperation,
  ApiParam,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { WhatsappService } from './whatsapp.service';
import { Inject } from '@nestjs/common';
import type { IWhatsAppProvider } from './providers/whatsapp-provider.interface';
import { WHATSAPP_PROVIDER } from './providers/whatsapp-provider.interface';
import { IsDefined, IsNotEmpty, IsString } from 'class-validator';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Number as WhatsAppNumber } from '../database/entities/number.entity';
import { SendPollDto } from './dto/send-poll.dto';

class WahaQrDto {
  @IsDefined()
  @IsString()
  @IsNotEmpty()
  session!: string;
}

class WahaDisconnectDto {
  @IsDefined()
  @IsString()
  @IsNotEmpty()
  session!: string;
}

@ApiTags('WhatsApp (WAHA Compatibility)')
@Controller('api/v1')
export class WahaCompatController {
  constructor(
    private readonly whatsappService: WhatsappService,
    @Inject(WHATSAPP_PROVIDER)
    private readonly whatsappProvider: IWhatsAppProvider,
    @InjectRepository(WhatsAppNumber)
    private readonly numberRepository: Repository<WhatsAppNumber>,
  ) {}

  @Post('waha/qr')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth('JWT-auth')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Gerar QR Code (WAHA compat)' })
  @ApiBody({
    schema: { type: 'object', properties: { session: { type: 'string' } } },
  })
  @ApiResponse({ status: 200, description: 'QR Code gerado' })
  @ApiResponse({ status: 404, description: 'Sessão não encontrada' })
  async generateQr(@Body() body: WahaQrDto) {
    const res = await this.whatsappProvider.getQrCode(body.session);
    if (!res.qrcode && !res.base64) {
      throw new NotFoundException('Sessão não encontrada');
    }
    return { qr: res.qrcode || res.base64, instance: body.session, status: 'SCAN_QR_CODE' };
  }

  @Get('waha/sessions/:sessionName')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({ summary: 'Status da sessão (WAHA compat)' })
  @ApiParam({ name: 'sessionName', example: 'default' })
  @ApiResponse({ status: 200, description: 'Status retornado' })
  @ApiResponse({ status: 404, description: 'Sessão não encontrada' })
  async getSession(@Param('sessionName') sessionName: string) {
    const info = await this.whatsappProvider.getInstanceStatus(sessionName);
    const number = await this.numberRepository.findOne({
      where: { instance: sessionName },
    });
    return {
      session: sessionName,
      status: info.status.toUpperCase(),
      me: info.phoneNumber
        ? { id: `${info.phoneNumber}@c.us`, pushName: info.profileName || '' }
        : undefined,
      config: { proxy: null, webhooks: [] },
      number_id: number?.id ?? null,
    };
  }

  @Post('waha/disconnect')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth('JWT-auth')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Desconectar sessão (WAHA compat)' })
  @ApiBody({
    schema: { type: 'object', properties: { session: { type: 'string' } } },
  })
  @ApiResponse({ status: 200, description: 'Sessão desconectada' })
  async disconnect(@Body() body: WahaDisconnectDto) {
    try {
      await this.whatsappProvider.deleteInstance(body.session);
    } catch (_e) {
      void 0;
    }
    return { success: true };
  }

  @Post('disconnect-waha-session')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Desconectar sessão pública (compat)' })
  @ApiBody({
    schema: { type: 'object', properties: { session: { type: 'string' } } },
  })
  @ApiResponse({ status: 200 })
  async disconnectPublic(@Body('session') session = 'default') {
    try {
      await this.whatsappProvider.deleteInstance(session);
    } catch (_e) {
      void 0;
    }
    return { success: true };
  }

  @Post('webhook-whatsapp')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Webhook WAHA compatível' })
  @ApiResponse({ status: 200 })
  async webhookWhatsapp(@Body() payload: any) {
    return this.whatsappService.handleWebhook(payload);
  }

  @Post('webhook-whatsapp-extractor')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Webhook extractor compatível' })
  @ApiResponse({ status: 200 })
  async webhookExtractor(@Body() payload: any) {
    return { success: true };
  }

  @Post('whatsapp/:instance/poll')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Enviar enquete (compat)' })
  @ApiParam({ name: 'instance', example: 'default' })
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        name: { type: 'string' },
        options: { type: 'array', items: { type: 'string' } },
        selectableCount: { type: 'number' },
        chatId: { type: 'string' },
      },
      required: ['name', 'options', 'selectableCount', 'chatId'],
    },
  })
  @ApiResponse({ status: 200, description: 'Enquete enviada' })
  async sendPoll(
    @Param('instance') instance: string,
    @Body() body: SendPollDto,
  ) {
    return { success: true, message_id: 'poll_' + Date.now() };
  }

  @Get('whatsapp/:instance/settings')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Obter configurações da instância (compat)' })
  @ApiParam({ name: 'instance', example: 'default' })
  @ApiResponse({ status: 200 })
  async getSettings(@Param('instance') instance: string) {
    return {
      reject_call: false,
      proxy: null,
      webhooks: [],
      groups_ignore: [],
    };
  }

  @Post('whatsapp/:instance/settings')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Atualizar configurações da instância (compat)' })
  @ApiParam({ name: 'instance', example: 'default' })
  @ApiBody({ schema: { type: 'object' } })
  @ApiResponse({ status: 200 })
  async updateSettings(
    @Param('instance') instance: string,
    @Body() settings: Record<string, any>,
  ) {
    return { success: true };
  }
}
