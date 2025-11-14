import {
  Injectable,
  Logger,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Number } from '../database/entities/number.entity';
import { MessageByContact } from '../database/entities/message-by-contact.entity';
import { PublicByContact } from '../database/entities/public-by-contact.entity';
import { WhatsAppCloudService } from './whatsapp-cloud.service';
import { SetupWhatsAppDto } from './dto/setup-whatsapp.dto';
import {
  SendTextMessageDto,
  SendTemplateMessageDto,
  SendImageMessageDto,
} from './dto/send-message.dto';
import {
  WhatsAppWebhookPayload,
  WhatsAppMessage,
  WhatsAppStatus,
} from './dto/webhook.dto';

/**
 * WhatsappService
 *
 * Service para gerenciar lógica de negócio WhatsApp
 * Agora usa WhatsApp Cloud API (Meta) em vez de WAHA
 *
 * Vantagens:
 * - ✅ Suporta múltiplas sessões (cada usuário pode ter seu próprio Phone Number ID)
 * - ✅ Não precisa de QR Code (usa Phone Number ID + Access Token da Meta)
 * - ✅ Mais estável e seguro (API oficial)
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
    private readonly whatsappCloudService: WhatsAppCloudService,
  ) {}

  /**
   * Setup WhatsApp - Configura Phone Number ID e Access Token
   * Substitui o antigo método connect() que usava QR Code
   */
  async setupWhatsApp(userId: number, dto: SetupWhatsAppDto) {
    this.logger.log('🔌 Configurando WhatsApp Cloud API', { userId });

    try {
      // Verificar se o Phone Number ID é válido
      const phoneInfo = await this.whatsappCloudService.getPhoneNumberInfo(
        dto.phone_number_id,
        dto.access_token,
      );

      this.logger.log('✅ Phone Number ID válido', {
        verified_name: phoneInfo.verified_name,
        display_phone_number: phoneInfo.display_phone_number,
      });

      // Verificar se já existe um número ativo para este usuário
      let number = await this.numberRepository.findOne({
        where: { user_id: userId, status: 1 },
      });

      if (!number) {
        // Criar novo número
        number = this.numberRepository.create({
          user_id: userId,
          name: dto.name || phoneInfo.verified_name || 'WhatsApp Principal',
          instance: dto.phone_number_id, // Usar Phone Number ID como instance
          status: 1,
          status_connection: 1, // Já conectado pois tem access token válido
          cel: phoneInfo.display_phone_number,
          token_wpp: dto.access_token,
          token_wpp_expiresin: null, // System User Token não expira
        });
      } else {
        // Atualizar número existente
        number.instance = dto.phone_number_id;
        number.status_connection = 1;
        number.cel = phoneInfo.display_phone_number;
        number.token_wpp = dto.access_token;
        number.token_wpp_expiresin = null;
        if (dto.name) {
          number.name = dto.name;
        }
      }

      await this.numberRepository.save(number);

      this.logger.log('✅ WhatsApp configurado com sucesso', {
        number_id: number.id,
      });

      return {
        success: true,
        message: 'WhatsApp configurado com sucesso',
        number: {
          id: number.id,
          name: number.name,
          phone_number: phoneInfo.display_phone_number,
          verified_name: phoneInfo.verified_name,
          quality_rating: phoneInfo.quality_rating,
        },
      };
    } catch (error: unknown) {
      this.logger.error('❌ Erro ao configurar WhatsApp', {
        error: error instanceof Error ? error.message : String(error),
      });
      throw new BadRequestException(
        'Phone Number ID ou Access Token inválidos. Verifique suas credenciais.',
      );
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

      if (!number.token_wpp || !number.instance) {
        return {
          connected: false,
          message: 'WhatsApp não configurado',
        };
      }

      // Verificar se o token ainda é válido
      try {
        const phoneInfo = await this.whatsappCloudService.getPhoneNumberInfo(
          number.instance,
          number.token_wpp,
        );

        // Atualizar status de conexão
        await this.numberRepository.update(number.id, {
          status_connection: 1,
          cel: phoneInfo.display_phone_number,
        });

        return {
          connected: true,
          phone_number: phoneInfo.display_phone_number,
          verified_name: phoneInfo.verified_name,
          quality_rating: phoneInfo.quality_rating,
        };
      } catch (error) {
        // Token inválido ou expirado
        await this.numberRepository.update(number.id, {
          status_connection: 0,
        });

        return {
          connected: false,
          message: 'Access Token inválido ou expirado',
        };
      }
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
      // Buscar número do usuário
      const number = await this.numberRepository.findOne({
        where: { id: dto.number_id, user_id: userId },
      });

      if (!number) {
        throw new NotFoundException('Número não encontrado');
      }

      if (!number.token_wpp || !number.instance) {
        throw new BadRequestException(
          'WhatsApp não configurado. Configure primeiro.',
        );
      }

      // Enviar mensagem via WhatsApp Cloud API
      const result = await this.whatsappCloudService.sendTextMessage(
        number.instance,
        number.token_wpp,
        dto.to,
        dto.text,
      );

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

      if (!number.token_wpp || !number.instance) {
        throw new BadRequestException(
          'WhatsApp não configurado. Configure primeiro.',
        );
      }

      const result = await this.whatsappCloudService.sendTemplateMessage(
        number.instance,
        number.token_wpp,
        dto.to,
        dto.template_name,
        dto.language_code || 'pt_BR',
        dto.parameters,
      );

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

      if (!number.token_wpp || !number.instance) {
        throw new BadRequestException(
          'WhatsApp não configurado. Configure primeiro.',
        );
      }

      const result = await this.whatsappCloudService.sendImageMessage(
        number.instance,
        number.token_wpp,
        dto.to,
        dto.image_url,
        dto.caption,
      );

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

      // Soft delete
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
   * Handle webhook events from WhatsApp Cloud API
   */
  async handleWebhook(payload: WhatsAppWebhookPayload) {
    try {
      this.logger.log('📥 Webhook recebido', {
        object: payload.object,
        entries: payload.entry.length,
      });

      if (payload.object !== 'whatsapp_business_account') {
        this.logger.warn('⚠️ Webhook com object inválido', {
          object: payload.object,
        });
        return { success: false, message: 'Object inválido' };
      }

      for (const entry of payload.entry) {
        for (const change of entry.changes) {
          if (change.field === 'messages') {
            // Processar mensagens recebidas
            if (change.value.messages) {
              for (const message of change.value.messages) {
                await this.processIncomingMessage(
                  change.value.metadata.phone_number_id,
                  message,
                );
              }
            }

            // Processar status de mensagens enviadas
            if (change.value.statuses) {
              for (const status of change.value.statuses) {
                await this.processMessageStatus(
                  change.value.metadata.phone_number_id,
                  status,
                );
              }
            }
          }
        }
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

  /**
   * Process incoming message
   */
  private async processIncomingMessage(
    phoneNumberId: string,
    message: WhatsAppMessage,
  ) {
    this.logger.log('📩 Processando mensagem recebida', {
      phoneNumberId,
      messageId: message.id,
      type: message.type,
      from: message.from,
    });

    // TODO: Implementar lógica de processamento de mensagens recebidas
    // - Salvar no banco de dados
    // - Disparar eventos para webhooks do usuário
    // - Processar comandos automáticos
  }

  /**
   * Process message status update
   */
  private async processMessageStatus(
    phoneNumberId: string,
    status: WhatsAppStatus,
  ) {
    this.logger.log('✅ Processando status de mensagem', {
      phoneNumberId,
      messageId: status.id,
      status: status.status,
      recipientId: status.recipient_id,
    });

    // Atualizar status no banco de dados
    const phoneNumber = status.recipient_id.replace(/\D/g, '');

    try {
      // Atualizar MessageByContact
      switch (status.status) {
        case 'sent':
          await this.messageByContactRepository
            .createQueryBuilder()
            .update(MessageByContact)
            .set({ send: 1 } as any)
            .where(
              'contact_id IN (SELECT id FROM contacts WHERE number = :phone)',
              { phone: phoneNumber },
            )
            .execute();
          break;

        case 'delivered':
          await this.messageByContactRepository
            .createQueryBuilder()
            .update(MessageByContact)
            .set({ send: 1, delivered: 1 } as any)
            .where(
              'contact_id IN (SELECT id FROM contacts WHERE number = :phone)',
              { phone: phoneNumber },
            )
            .execute();
          break;

        case 'read':
          await this.messageByContactRepository
            .createQueryBuilder()
            .update(MessageByContact)
            .set({ send: 1, delivered: 1, read: 1 } as any)
            .where(
              'contact_id IN (SELECT id FROM contacts WHERE number = :phone)',
              { phone: phoneNumber },
            )
            .execute();

          // Atualizar PublicByContact também
          await this.publicByContactRepository
            .createQueryBuilder()
            .update(PublicByContact)
            .set({ read: 1 })
            .where(
              'contact_id IN (SELECT id FROM contacts WHERE number = :phone)',
              { phone: phoneNumber },
            )
            .execute();
          break;

        case 'failed':
          await this.messageByContactRepository
            .createQueryBuilder()
            .update(MessageByContact)
            .set({
              error: status.errors?.[0]?.message || 'Erro ao enviar mensagem',
            } as any)
            .where(
              'contact_id IN (SELECT id FROM contacts WHERE number = :phone)',
              { phone: phoneNumber },
            )
            .execute();
          break;
      }

      this.logger.log('✅ Status atualizado no banco de dados', {
        status: status.status,
      });
    } catch (error: unknown) {
      this.logger.error('❌ Erro ao atualizar status no banco', {
        error: error instanceof Error ? error.message : String(error),
      });
    }
  }
}
