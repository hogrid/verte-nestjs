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
  BadRequestException,
  Request,
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

class InstanceQrDto {
  @IsDefined()
  @IsString()
  @IsNotEmpty()
  session!: string;
}

class InstanceDisconnectDto {
  @IsDefined()
  @IsString()
  @IsNotEmpty()
  session!: string;
}

@ApiTags('WhatsApp (Legacy Compatibility)')
@Controller('api/v1')
export class LegacyCompatController {
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
  @ApiOperation({ summary: 'Gerar QR Code (Legacy compat)' })
  @ApiBody({
    schema: { type: 'object', properties: { session: { type: 'string' } } },
  })
  @ApiResponse({ status: 200, description: 'QR Code gerado' })
  @ApiResponse({ status: 404, description: 'Sessão não encontrada' })
  async generateQr(@Body() body: InstanceQrDto) {
    const res = await this.whatsappProvider.getQrCode(body.session);
    if (!res.qrcode && !res.base64) {
      throw new NotFoundException('Sessão não encontrada');
    }
    return {
      qr: res.qrcode || res.base64,
      instance: body.session,
      status: 'SCAN_QR_CODE',
    };
  }

  @Get('waha/sessions/:sessionName')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({ summary: 'Status da sessão (Legacy compat)' })
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
  @ApiOperation({
    summary: 'Desconectar sessão (Legacy compat)',
    description:
      'Desconecta a sessão WhatsApp do usuário autenticado. Usa logout em vez de deletar a instância.',
  })
  @ApiBody({
    schema: { type: 'object', properties: { session: { type: 'string' } } },
  })
  @ApiResponse({ status: 200, description: 'Sessão desconectada' })
  @ApiResponse({ status: 401, description: 'Não autorizado' })
  @ApiResponse({ status: 404, description: 'Sessão não encontrada' })
  async disconnect(
    @Request() req: { user: { id: number } },
    @Body() body: InstanceDisconnectDto,
  ) {
    if (!body.session) {
      throw new BadRequestException('Nome da sessão é obrigatório');
    }

    // Validar que o usuário é dono da instância
    const number = await this.numberRepository.findOne({
      where: {
        user_id: req.user.id,
        instance: body.session,
        status: 1,
      },
    });

    if (!number) {
      throw new NotFoundException(
        'Sessão não encontrada ou não pertence a este usuário',
      );
    }

    // Usar disconnectInstance (logout) em vez de deleteInstance
    try {
      await this.whatsappProvider.disconnectInstance(body.session);
    } catch (_e) {
      // Continuar mesmo se erro no Evolution API
    }

    // Atualizar banco de dados
    await this.numberRepository.update(number.id, {
      status_connection: 0,
    });

    return { success: true, message: 'Desconectado com sucesso' };
  }

  @Post('whatsapp/disconnect')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth('JWT-auth')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Desconectar sessão (Novo endpoint)',
    description:
      'Desconecta a sessão WhatsApp do usuário autenticado. Usa logout em vez de deletar a instância.',
  })
  @ApiBody({
    schema: { type: 'object', properties: { session: { type: 'string' } } },
  })
  @ApiResponse({ status: 200, description: 'Sessão desconectada' })
  @ApiResponse({ status: 401, description: 'Não autorizado' })
  @ApiResponse({ status: 404, description: 'Sessão não encontrada' })
  async disconnectWhatsapp(
    @Request() req: { user: { id: number } },
    @Body() body: InstanceDisconnectDto,
  ) {
    // Chama o mesmo método do endpoint antigo para manter compatibilidade
    return this.disconnect(req, body);
  }

  @Post('disconnect-waha-session')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth('JWT-auth')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Desconectar sessão WhatsApp (logout)',
    description:
      'Desconeta a sessão WhatsApp do usuário autenticado. Usa logout em vez de deletar a instância.',
  })
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        instanceName: {
          type: 'string',
          description: 'Nome da instância a desconectar',
        },
      },
    },
  })
  @ApiResponse({ status: 200, description: 'Desconectado com sucesso' })
  @ApiResponse({ status: 401, description: 'Não autorizado' })
  @ApiResponse({ status: 404, description: 'Instância não encontrada' })
  async disconnectPublic(
    @Request() req: { user: { id: number } },
    @Body('instanceName') instanceName: string,
  ) {
    if (!instanceName) {
      throw new BadRequestException('Nome da instância é obrigatório');
    }

    // Validar que o usuário é dono da instância
    const number = await this.numberRepository.findOne({
      where: {
        user_id: req.user.id,
        instance: instanceName,
        status: 1,
      },
    });

    if (!number) {
      throw new NotFoundException(
        'Instância não encontrada ou não pertence a este usuário',
      );
    }

    // Usar disconnectInstance (logout) em vez de deleteInstance
    // Isso mantém a instância para possível reconexão futura
    try {
      await this.whatsappProvider.disconnectInstance(instanceName);
    } catch (_e) {
      // Continuar mesmo se erro no Evolution API
      // Apenas atualizamos o banco de dados
    }

    // Atualizar banco de dados
    await this.numberRepository.update(number.id, {
      status_connection: 0,
    });

    return {
      success: true,
      message: 'Desconectado com sucesso',
    };
  }

  @Post('disconnect-whatsapp-session')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth('JWT-auth')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Desconectar sessão WhatsApp (logout) - Novo endpoint',
    description:
      'Desconecta a sessão WhatsApp do usuário autenticado. Usa logout em vez de deletar a instância.',
  })
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        instanceName: {
          type: 'string',
          description: 'Nome da instância a desconectar',
        },
      },
    },
  })
  @ApiResponse({ status: 200, description: 'Desconectado com sucesso' })
  @ApiResponse({ status: 401, description: 'Não autorizado' })
  @ApiResponse({ status: 404, description: 'Instância não encontrada' })
  async disconnectWhatsappSession(
    @Request() req: { user: { id: number } },
    @Body('instanceName') instanceName: string,
  ) {
    // Chama o mesmo método do endpoint antigo para manter compatibilidade
    return this.disconnectPublic(req, instanceName);
  }

  @Post('webhook-whatsapp')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Webhook Evolution API compatível' })
  @ApiResponse({ status: 200 })
  async webhookWhatsapp(@Body() payload: any) {
    return this.whatsappService.handleWebhook(payload);
  }

  @Post('webhook-whatsapp-extractor')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Webhook extractor compatível (Legacy)' })
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
