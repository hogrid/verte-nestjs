import {
  Injectable,
  Logger,
  NotFoundException,
  BadRequestException,
  Inject,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Number } from '../database/entities/number.entity';
import { MessageByContact } from '../database/entities/message-by-contact.entity';
import { PublicByContact } from '../database/entities/public-by-contact.entity';
import type { IWhatsAppProvider } from './providers/whatsapp-provider.interface';
import { WHATSAPP_PROVIDER } from './providers/whatsapp-provider.interface';
import { SetupWhatsAppDto } from './dto/setup-whatsapp.dto';
import {
  SendTextMessageDto,
  SendTemplateMessageDto,
  SendImageMessageDto,
} from './dto/send-message.dto';

/**
 * WhatsappService
 *
 * Service para gerenciar lógica de negócio WhatsApp
 *
 * **ARQUITETURA DESACOPLADA**:
 * - Usa IWhatsAppProvider interface (não depende de implementação concreta)
 * - Permite trocar provider facilmente (Evolution API, WAHA, Cloud API, etc)
 * - Provider injetado via Dependency Injection
 *
 * Benefícios:
 * - ✅ Fácil trocar de provider WhatsApp
 * - ✅ Testável (mock providers)
 * - ✅ Extensível (adicionar novos providers sem alterar service)
 */
@Injectable()
export class WhatsappService {
  private readonly logger = new Logger(WhatsappService.name);

  constructor(
    @InjectRepository(Number)
    private readonly numberRepository: Repository<Number>,
    @InjectRepository(MessageByContact)
    private readonly messageByContactRepository: Repository<MessageByContact>,
    @InjectRepository(PublicByContact)
    private readonly publicByContactRepository: Repository<PublicByContact>,
    @Inject(WHATSAPP_PROVIDER)
    private readonly whatsappProvider: IWhatsAppProvider,
  ) {
    this.logger.log(
      `📱 WhatsappService initialized with provider: ${this.whatsappProvider.providerName} (${this.whatsappProvider.providerVersion})`,
    );
  }

  /**
   * Setup WhatsApp - Criar instância e gerar QR Code
   */
  async setupWhatsApp(userId: number, dto: SetupWhatsAppDto) {
    this.logger.log('🔌 Configurando WhatsApp', { userId, dto });

    try {
      // Criar nome único da instância baseado no userId
      const instanceName =
        dto.instanceName || `user_${userId}_${Date.now()}`;

      // Criar instância no provider (Evolution API)
      const instanceInfo = await this.whatsappProvider.createInstance({
        instanceName,
        qrcode: true,
        webhookUrl: dto.webhookUrl,
      });

      this.logger.log('✅ Instância criada no provider', { instanceName });

      // Verificar se já existe um número ativo para este usuário
      let number = await this.numberRepository.findOne({
        where: { user_id: userId, status: 1 },
      });

      if (!number) {
        // Criar novo número
        number = this.numberRepository.create({
          user_id: userId,
          name: dto.name || 'WhatsApp Principal',
          instance: instanceName,
          status: 1,
          status_connection: 0, // Aguardando conexão via QR Code
          qrcode: instanceInfo.qrCode || null,
        });
      } else {
        // Atualizar número existente
        number.instance = instanceName;
        number.status_connection = 0; // Resetar status
        number.qrcode = instanceInfo.qrCode || null;
        if (dto.name) {
          number.name = dto.name;
        }
      }

      await this.numberRepository.save(number);

      this.logger.log('✅ WhatsApp configurado com sucesso', {
        number_id: number.id,
        instanceName,
      });

      return {
        success: true,
        message:
          'WhatsApp configurado. Escaneie o QR Code para conectar seu número.',
        number: {
          id: number.id,
          name: number.name,
          instance_name: instanceName,
          qr_code: instanceInfo.qrCode,
          status: 'qr', // Aguardando scan do QR Code
        },
      };
    } catch (error: unknown) {
      this.logger.error('❌ Erro ao configurar WhatsApp', {
        error: error instanceof Error ? error.message : String(error),
      });
      throw new BadRequestException(
        `Erro ao configurar WhatsApp: ${error instanceof Error ? error.message : 'Erro desconhecido'}`,
      );
    }
  }

  /**
   * Get QR Code - Obter QR Code para conectar
   */
  async getQRCode(userId: number, numberId: number) {
    this.logger.log('📷 Obtendo QR Code', { userId, numberId });

    try {
      const number = await this.numberRepository.findOne({
        where: { id: numberId, user_id: userId },
      });

      if (!number) {
        throw new NotFoundException('Número não encontrado');
      }

      if (!number.instance) {
        throw new BadRequestException('Instância não configurada');
      }

      // Obter QR Code do provider
      const qrData = await this.whatsappProvider.getQRCode(number.instance);

      // Atualizar QR Code no banco
      await this.numberRepository.update(number.id, {
        qrcode: qrData.qr,
      });

      return {
        success: true,
        qr_code: qrData.qr,
        instance_name: number.instance,
      };
    } catch (error: unknown) {
      this.logger.error('❌ Erro ao obter QR Code', {
        error: error instanceof Error ? error.message : String(error),
      });
      throw error;
    }
  }

  /**
   * Check connection status
   */
  async checkConnection(userId: number) {
    this.logger.log('🔍 Verificando conexão WhatsApp', { userId });

    try {
      const number = await this.numberRepository.findOne({
        where: { user_id: userId, status: 1 },
      });

      if (!number) {
        return {
          connected: false,
          message: 'Número não encontrado',
        };
      }

      if (!number.instance) {
        return {
          connected: false,
          message: 'WhatsApp não configurado',
        };
      }

      // Verificar status no provider
      const instanceInfo = await this.whatsappProvider.getInstanceStatus(
        number.instance,
      );

      // Atualizar status no banco
      const connectionStatus =
        instanceInfo.status === 'connected' ? 1 : 0;
      await this.numberRepository.update(number.id, {
        status_connection: connectionStatus,
        cel: instanceInfo.phoneNumber || number.cel,
      });

      return {
        connected: instanceInfo.status === 'connected',
        status: instanceInfo.status,
        phone_number: instanceInfo.phoneNumber,
        profile_name: instanceInfo.profileName,
        instance_name: number.instance,
      };
    } catch (error: unknown) {
      this.logger.error('❌ Erro ao verificar conexão', {
        error: error instanceof Error ? error.message : String(error),
      });

      return {
        connected: false,
        error: error instanceof Error ? error.message : 'Erro desconhecido',
      };
    }
  }

  /**
   * Send text message
   */
  async sendTextMessage(userId: number, dto: SendTextMessageDto) {
    this.logger.log('📤 Enviando mensagem de texto', { userId, dto });

    try {
      const number = await this.numberRepository.findOne({
        where: { id: dto.number_id, user_id: userId },
      });

      if (!number) {
        throw new NotFoundException('Número não encontrado');
      }

      if (!number.instance) {
        throw new BadRequestException(
          'WhatsApp não configurado. Configure primeiro.',
        );
      }

      if (number.status_connection !== 1) {
        throw new BadRequestException(
          'WhatsApp não conectado. Conecte via QR Code primeiro.',
        );
      }

      // Enviar mensagem via provider
      const result = await this.whatsappProvider.sendText(number.instance, {
        to: dto.to,
        text: dto.text,
      });

      this.logger.log('✅ Mensagem enviada', { messageId: result.messageId });

      return {
        success: true,
        message_id: result.messageId,
      };
    } catch (error: unknown) {
      this.logger.error('❌ Erro ao enviar mensagem', {
        error: error instanceof Error ? error.message : String(error),
      });
      throw error;
    }
  }

  /**
   * Send template message
   */
  async sendTemplateMessage(userId: number, dto: SendTemplateMessageDto) {
    this.logger.log('📤 Enviando template', { userId, dto });

    try {
      const number = await this.numberRepository.findOne({
        where: { id: dto.number_id, user_id: userId },
      });

      if (!number) {
        throw new NotFoundException('Número não encontrado');
      }

      if (!number.instance) {
        throw new BadRequestException(
          'WhatsApp não configurado. Configure primeiro.',
        );
      }

      if (number.status_connection !== 1) {
        throw new BadRequestException(
          'WhatsApp não conectado. Conecte via QR Code primeiro.',
        );
      }

      // Enviar template via provider (se suportado)
      let result;
      if (this.whatsappProvider.sendTemplate) {
        result = await this.whatsappProvider.sendTemplate(number.instance, {
          to: dto.to,
          templateName: dto.template_name,
          languageCode: dto.language_code || 'pt_BR',
          parameters: dto.parameters,
        });
      } else {
        // Fallback: enviar como texto
        this.logger.warn('⚠️ Provider não suporta templates. Enviando como texto.');
        result = await this.whatsappProvider.sendText(number.instance, {
          to: dto.to,
          text: `Template: ${dto.template_name}`,
        });
      }

      this.logger.log('✅ Template enviado', { messageId: result.messageId });

      return {
        success: true,
        message_id: result.messageId,
      };
    } catch (error: unknown) {
      this.logger.error('❌ Erro ao enviar template', {
        error: error instanceof Error ? error.message : String(error),
      });
      throw error;
    }
  }

  /**
   * Send image message
   */
  async sendImageMessage(userId: number, dto: SendImageMessageDto) {
    this.logger.log('🖼️ Enviando imagem', { userId, dto });

    try {
      const number = await this.numberRepository.findOne({
        where: { id: dto.number_id, user_id: userId },
      });

      if (!number) {
        throw new NotFoundException('Número não encontrado');
      }

      if (!number.instance) {
        throw new BadRequestException(
          'WhatsApp não configurado. Configure primeiro.',
        );
      }

      if (number.status_connection !== 1) {
        throw new BadRequestException(
          'WhatsApp não conectado. Conecte via QR Code primeiro.',
        );
      }

      // Enviar imagem via provider
      const result = await this.whatsappProvider.sendMedia(number.instance, {
        to: dto.to,
        mediaUrl: dto.image_url,
        mediaType: 'image',
        caption: dto.caption,
      });

      this.logger.log('✅ Imagem enviada', { messageId: result.messageId });

      return {
        success: true,
        message_id: result.messageId,
      };
    } catch (error: unknown) {
      this.logger.error('❌ Erro ao enviar imagem', {
        error: error instanceof Error ? error.message : String(error),
      });
      throw error;
    }
  }

  /**
   * List user numbers
   */
  async listNumbers(userId: number) {
    this.logger.log('📋 Listando números', { userId });

    try {
      const numbers = await this.numberRepository.find({
        where: { user_id: userId },
        order: { id: 'DESC' },
      });

      return {
        data: numbers.map((n) => ({
          id: n.id,
          name: n.name,
          phone_number: n.cel,
          instance_name: n.instance,
          status: n.status,
          status_connection: n.status_connection,
          created_at: n.created_at,
        })),
        count: numbers.length,
      };
    } catch (error: unknown) {
      this.logger.error('❌ Erro ao listar números', {
        error: error instanceof Error ? error.message : String(error),
      });
      throw error;
    }
  }

  /**
   * Show number details
   */
  async showNumber(userId: number, numberId: number) {
    this.logger.log('🔍 Buscando número', { userId, numberId });

    try {
      const number = await this.numberRepository.findOne({
        where: { id: numberId, user_id: userId },
      });

      if (!number) {
        throw new NotFoundException('Número não encontrado');
      }

      return {
        data: {
          id: number.id,
          name: number.name,
          phone_number: number.cel,
          instance_name: number.instance,
          status: number.status,
          status_connection: number.status_connection,
          created_at: number.created_at,
          updated_at: number.updated_at,
        },
      };
    } catch (error: unknown) {
      this.logger.error('❌ Erro ao buscar número', {
        error: error instanceof Error ? error.message : String(error),
      });
      throw error;
    }
  }

  /**
   * Remove number (soft delete)
   */
  async removeNumber(userId: number, numberId: number) {
    this.logger.log('🗑️ Removendo número', { userId, numberId });

    try {
      const number = await this.numberRepository.findOne({
        where: { id: numberId, user_id: userId },
      });

      if (!number) {
        throw new NotFoundException('Número não encontrado');
      }

      // Deletar instância no provider
      if (number.instance) {
        try {
          await this.whatsappProvider.deleteInstance(number.instance);
          this.logger.log('✅ Instância deletada no provider');
        } catch (error) {
          this.logger.warn(
            '⚠️ Erro ao deletar instância no provider (continuando...)',
          );
        }
      }

      // Soft delete no banco
      await this.numberRepository.softDelete(numberId);

      this.logger.log('✅ Número removido', { number_id: numberId });

      return {
        success: true,
        message: 'Número removido com sucesso',
      };
    } catch (error: unknown) {
      this.logger.error('❌ Erro ao remover número', {
        error: error instanceof Error ? error.message : String(error),
      });
      throw error;
    }
  }

  /**
   * Handle webhook events
   */
  async handleWebhook(payload: any) {
    try {
      this.logger.log('📥 Webhook recebido');

      // Validar webhook (se provider suportar)
      if (this.whatsappProvider.validateWebhook) {
        const isValid = this.whatsappProvider.validateWebhook(payload);
        if (!isValid) {
          this.logger.warn('⚠️ Webhook inválido');
          return { success: false, message: 'Webhook inválido' };
        }
      }

      // Processar webhook (se provider suportar)
      if (this.whatsappProvider.processWebhook) {
        const processed = await this.whatsappProvider.processWebhook(payload);

        this.logger.log('✅ Webhook processado', { type: processed.type });

        // TODO: Implementar lógica de processamento baseada no tipo
        // - message: Salvar mensagem recebida no banco
        // - status: Atualizar status de mensagem enviada
        // - connection: Atualizar status de conexão
      }

      return {
        success: true,
        message: 'Webhook processado',
      };
    } catch (error: unknown) {
      this.logger.error('❌ Erro ao processar webhook', {
        error: error instanceof Error ? error.message : String(error),
      });

      return {
        success: false,
        error: error instanceof Error ? error.message : 'Erro desconhecido',
      };
    }
  }
}
