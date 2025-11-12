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
import { WahaService } from './waha.service';
import { UpdateSettingsDto } from './dto/update-settings.dto';
import { SendPollDto } from './dto/send-poll.dto';
import {
  WahaWebhookEvent,
  MessageAckPayload,
  MessageSentPayload,
  SessionStatusPayload,
  MessageAckStatus,
  getAckStatusText,
} from './dto/webhook-event.dto';

/**
 * WhatsappService
 *
 * Service para gerenciar lógica de negócio WhatsApp
 * Mantém 100% de compatibilidade com Laravel WhatsappController
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
    private readonly wahaService: WahaService,
  ) {}

  /**
   * Connect WhatsApp - Start connection process
   * Laravel: WhatsappController@connect
   */
  async connect(userId: number) {
    this.logger.log('🔌 Iniciando conexão WhatsApp', { userId });

    try {
      // Get active number or create new one
      let number = await this.numberRepository.findOne({
        where: { user_id: userId, status: 1 },
      });

      if (!number) {
        // Create default number
        number = this.numberRepository.create({
          user_id: userId,
          name: 'Padrão',
          instance: `user_${userId}_default`,
          status: 1,
          status_connection: 0,
        });
        await this.numberRepository.save(number);
        this.logger.log('✅ Número criado', { number_id: number.id });
      }

      // Start WAHA session
      await this.wahaService.startSession(number.instance);

      // Get QR Code
      const qrData = await this.wahaService.getQrCode(number.instance);

      // Update number with QR Code
      await this.numberRepository.update(number.id, {
        qrcode: qrData.qr,
      });

      this.logger.log('✅ QR Code gerado', { number_id: number.id });

      return {
        qr: qrData.qr,
        instance: number.instance,
        number_id: number.id,
      };
    } catch (error: unknown) {
      this.logger.error('❌ Erro ao conectar WhatsApp', {
        error: error instanceof Error ? error.message : String(error),
      });
      throw error;
    }
  }

  /**
   * Check connection status
   * Laravel: WhatsappController@checkConnection
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

      // Check WAHA session status
      const sessionStatus = await this.wahaService.getSessionStatus(
        number.instance,
      );

      const isConnected = sessionStatus.status === 'WORKING';

      // Update database
      await this.numberRepository.update(number.id, {
        status_connection: isConnected ? 1 : 0,
        cel: sessionStatus.me?.id || number.cel,
      });

      this.logger.log('✅ Status verificado', {
        number_id: number.id,
        connected: isConnected,
      });

      return {
        connected: isConnected,
        status: sessionStatus.status,
        number: sessionStatus.me?.id,
        instance: number.instance,
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
   * Force check all connections
   * Laravel: WhatsappController (Closure)
   */
  async forceCheckAllConnections(userId: number) {
    this.logger.log('🔄 Forçando verificação de todas as conexões', { userId });

    try {
      const numbers = await this.numberRepository.find({
        where: { user_id: userId },
      });

      const results = [];

      for (const number of numbers) {
        try {
          const sessionStatus = await this.wahaService.getSessionStatus(
            number.instance,
          );

          const isConnected = sessionStatus.status === 'WORKING';

          await this.numberRepository.update(number.id, {
            status_connection: isConnected ? 1 : 0,
          });

          results.push({
            number_id: number.id,
            instance: number.instance,
            connected: isConnected,
            status: sessionStatus.status,
          });
        } catch (error: unknown) {
          results.push({
            number_id: number.id,
            instance: number.instance,
            connected: false,
            error: error instanceof Error ? error.message : 'Erro desconhecido',
          });
        }
      }

      this.logger.log('✅ Verificação completa', { count: results.length });

      return {
        checked: results.length,
        results,
      };
    } catch (error: unknown) {
      this.logger.error('❌ Erro ao verificar conexões', {
        error: error instanceof Error ? error.message : String(error),
      });
      throw error;
    }
  }

  /**
   * Get QR Code for specific session
   * Laravel: WhatsappController@getWahaQr
   */
  async getQrCode(userId: number, session: string) {
    this.logger.log('📱 Gerando QR Code', { userId, session });

    try {
      // Find number by instance name
      const number = await this.numberRepository.findOne({
        where: { user_id: userId, instance: session },
      });

      if (!number) {
        throw new NotFoundException('Sessão não encontrada');
      }

      // Get QR Code from WAHA
      const qrData = await this.wahaService.getQrCode(session);

      // Update number
      await this.numberRepository.update(number.id, {
        qrcode: qrData.qr,
      });

      return {
        qr: qrData.qr,
        instance: session,
      };
    } catch (error: unknown) {
      this.logger.error('❌ Erro ao gerar QR Code', {
        error: error instanceof Error ? error.message : String(error),
      });
      throw error;
    }
  }

  /**
   * Get session status
   * Laravel: WhatsappController@getWahaSessionStatus
   */
  async getSessionStatus(userId: number, sessionName: string) {
    this.logger.log('🔍 Buscando status da sessão', { userId, sessionName });

    try {
      const number = await this.numberRepository.findOne({
        where: { user_id: userId, instance: sessionName },
      });

      if (!number) {
        throw new NotFoundException('Sessão não encontrada');
      }

      const sessionStatus =
        await this.wahaService.getSessionStatus(sessionName);

      return {
        ...sessionStatus,
        number_id: number.id,
      };
    } catch (error: unknown) {
      this.logger.error('❌ Erro ao buscar status da sessão', {
        error: error instanceof Error ? error.message : String(error),
      });
      throw error;
    }
  }

  /**
   * Disconnect WAHA session
   * Laravel: WhatsappController@disconnectWahaSession
   */
  async disconnectSession(userId: number, session: string) {
    this.logger.log('🚪 Desconectando sessão', { userId, session });

    try {
      const number = await this.numberRepository.findOne({
        where: { user_id: userId, instance: session },
      });

      if (!number) {
        throw new NotFoundException('Sessão não encontrada');
      }

      // Logout from WAHA
      await this.wahaService.logoutSession(session);

      // Update database
      await this.numberRepository.update(number.id, {
        status_connection: 0,
        qrcode: null,
      });

      this.logger.log('✅ Sessão desconectada', { number_id: number.id });

      return {
        success: true,
        message: 'Sessão desconectada com sucesso',
      };
    } catch (error: unknown) {
      this.logger.error('❌ Erro ao desconectar sessão', {
        error: error instanceof Error ? error.message : String(error),
      });
      throw error;
    }
  }

  /**
   * Send poll via WhatsApp
   * Laravel: WhatsappController@sendPoll
   */
  async sendPoll(instance: string, dto: SendPollDto) {
    this.logger.log('📊 Enviando enquete', { instance });

    try {
      const result = await this.wahaService.sendPoll(instance, dto.number, {
        name: dto.name,
        options: dto.options,
        selectableCount: dto.selectableCount,
      });

      return {
        success: true,
        message_id: result.id,
      };
    } catch (error: unknown) {
      this.logger.error('❌ Erro ao enviar enquete', {
        error: error instanceof Error ? error.message : String(error),
      });
      throw error;
    }
  }

  /**
   * Get instance settings
   * Laravel: WhatsappController@getSettings
   */
  async getSettings(instance: string) {
    this.logger.log('⚙️ Buscando configurações', { instance });

    try {
      const settings = await this.wahaService.getSettings(instance);

      return settings;
    } catch (error: unknown) {
      this.logger.error('❌ Erro ao buscar configurações', {
        error: error instanceof Error ? error.message : String(error),
      });
      throw error;
    }
  }

  /**
   * Update instance settings
   * Laravel: WhatsappController@setSettings
   */
  async updateSettings(instance: string, dto: UpdateSettingsDto) {
    this.logger.log('⚙️ Atualizando configurações', { instance });

    try {
      const settings = await this.wahaService.updateSettings(
        instance,
        dto as Record<string, unknown>,
      );

      return {
        success: true,
        settings,
      };
    } catch (error: unknown) {
      this.logger.error('❌ Erro ao atualizar configurações', {
        error: error instanceof Error ? error.message : String(error),
      });
      throw error;
    }
  }

  /**
   * List user numbers
   * Laravel: WhatsappController@index
   */
  async listNumbers(userId: number) {
    this.logger.log('📋 Listando números', { userId });

    try {
      const numbers = await this.numberRepository.find({
        where: { user_id: userId },
        order: { id: 'DESC' },
      });

      return {
        data: numbers,
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
   * Laravel: WhatsappController@show
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
        data: number,
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
   * Laravel: WhatsappController@destroy
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

      // Disconnect session if connected
      if (number.status_connection === 1) {
        try {
          await this.wahaService.logoutSession(number.instance);
        } catch (error: unknown) {
          this.logger.warn('⚠️ Erro ao desconectar sessão ao remover', {
            error: error instanceof Error ? error.message : String(error),
          });
        }
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
   * Handle webhook events from WAHA
   * Laravel: WhatsappController@webhook
   */
  async handleWebhook(payload: unknown) {
    try {
      // Validar estrutura do evento
      if (!this.isWahaWebhookEvent(payload)) {
        this.logger.warn('⚠️ Webhook recebido com estrutura inválida', {
          payload,
        });
        return {
          success: false,
          message: 'Estrutura de webhook inválida',
        };
      }

      const event = payload;

      this.logger.log('📥 Webhook WAHA recebido', {
        event: event.event,
        session: event.session,
      });

      // Processar diferentes tipos de eventos
      switch (event.event) {
        case 'message.ack':
          await this.handleMessageAck(event);
          break;

        case 'message.sent':
          await this.handleMessageSent(event);
          break;

        case 'session.status':
          await this.handleSessionStatus(event);
          break;

        case 'message.any':
          // Log para debug, mas não processamos aqui
          this.logger.debug('📩 Mensagem recebida (message.any)', {
            session: event.session,
          });
          break;

        default:
          this.logger.debug(`📌 Evento não tratado: ${event.event}`);
      }

      return {
        success: true,
        message: 'Webhook processado',
      };
    } catch (error: unknown) {
      this.logger.error('❌ Erro ao processar webhook', {
        error: error instanceof Error ? error.message : String(error),
        stack: error instanceof Error ? error.stack : undefined,
      });

      // Não lançar erro para evitar retry infinito do WAHA
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Erro desconhecido',
      };
    }
  }

  /**
   * Type guard para validar estrutura de webhook WAHA
   */
  private isWahaWebhookEvent(payload: unknown): payload is WahaWebhookEvent {
    if (typeof payload !== 'object' || payload === null) {
      return false;
    }

    const event = payload as Record<string, unknown>;
    return (
      typeof event.event === 'string' &&
      typeof event.session === 'string' &&
      'payload' in event
    );
  }

  /**
   * Handle message.ack event
   * Atualiza status de entrega/leitura de mensagens
   */
  private async handleMessageAck(event: WahaWebhookEvent) {
    try {
      const payload = event.payload as MessageAckPayload;

      this.logger.log('✅ Processando message.ack', {
        session: event.session,
        ack: payload.ack,
        ackText: getAckStatusText(payload.ack),
        messageId: payload.id,
      });

      // Atualizar MessageByContact baseado no ACK status
      const updates: Partial<MessageByContact> = {};

      switch (payload.ack) {
        case MessageAckStatus.SERVER_ACK: // 2 - Enviada ao servidor
        case MessageAckStatus.PENDING: // 1 - Pendente
          updates.send = 1;
          break;

        case MessageAckStatus.DELIVERY_ACK: // 3 - Entregue ao destinatário
          updates.send = 1;
          updates.delivered = 1;
          break;

        case MessageAckStatus.READ: // 4 - Lida pelo destinatário
        case MessageAckStatus.PLAYED: // 5 - Reproduzida (áudio/vídeo)
          updates.send = 1;
          updates.delivered = 1;
          updates.read = 1;
          break;

        case MessageAckStatus.ERROR: // 0 - Erro
          updates.error = 'Erro ao enviar mensagem';
          break;
      }

      // Atualizar MessageByContact (buscar pelo contact_id do número destinatário)
      const phoneNumber = this.extractPhoneNumber(payload.to);
      if (phoneNumber) {
        // Atualizar somente colunas existentes no schema atual
        const [{ db }]: any = await this.messageByContactRepository.query(
          'SELECT DATABASE() AS db',
        );
        const canSetSend = await this.hasColumn(
          db,
          'message_by_contacts',
          'send',
        );
        const canSetDelivered = await this.hasColumn(
          db,
          'message_by_contacts',
          'delivered',
        );
        const canSetRead = await this.hasColumn(
          db,
          'message_by_contacts',
          'read',
        );

        const safeUpdates: Partial<MessageByContact> = {};
        if (canSetSend && typeof updates.send !== 'undefined')
          safeUpdates.send = updates.send;
        if (canSetDelivered && typeof updates.delivered !== 'undefined')
          safeUpdates.delivered = updates.delivered;
        if (canSetRead && typeof updates.read !== 'undefined')
          safeUpdates.read = updates.read;

        if (Object.keys(safeUpdates).length > 0) {
          await this.messageByContactRepository
            .createQueryBuilder()
            .update(MessageByContact)
            .set(safeUpdates)
            .where(
              'contact_id IN (SELECT id FROM contacts WHERE number = :phone)',
              { phone: phoneNumber },
            )
            .execute();
        }

        // Atualizar PublicByContact se mensagem foi lida
        if (
          payload.ack === MessageAckStatus.READ ||
          payload.ack === MessageAckStatus.PLAYED
        ) {
          await this.publicByContactRepository
            .createQueryBuilder()
            .update(PublicByContact)
            .set({ read: 1 })
            .where(
              'contact_id IN (SELECT id FROM contacts WHERE number = :phone)',
              {
                phone: phoneNumber,
              },
            )
            .execute();
        }
      }

      this.logger.log('✅ message.ack processado', {
        phone: phoneNumber,
        updates,
      });
    } catch (error: unknown) {
      this.logger.error('❌ Erro ao processar message.ack', {
        error: error instanceof Error ? error.message : String(error),
      });
    }
  }

  /**
   * Handle message.sent event
   * Confirma que mensagem foi enviada com sucesso
   */
  private async handleMessageSent(event: WahaWebhookEvent) {
    try {
      const payload = event.payload as MessageSentPayload;

      this.logger.log('📤 Processando message.sent', {
        session: event.session,
        messageId: payload.id,
        to: payload.to,
      });

      const phoneNumber = this.extractPhoneNumber(payload.to);
      if (phoneNumber) {
        // Atualizar MessageByContact (se coluna existir)
        const [{ db }]: any = await this.messageByContactRepository.query(
          'SELECT DATABASE() AS db',
        );
        const canSetSend = await this.hasColumn(
          db,
          'message_by_contacts',
          'send',
        );
        if (canSetSend) {
          try {
            await this.messageByContactRepository
              .createQueryBuilder()
              .update('message_by_contacts')
              .set({ send: 1 } as any)
              .where(
                'contact_id IN (SELECT id FROM contacts WHERE number = :phone)',
                { phone: phoneNumber },
              )
              .execute();
          } catch (e) {
            this.logger.warn('⚠️ Não foi possível marcar send=1 (coluna ausente?)');
          }
        }

        // Atualizar PublicByContact (somente colunas existentes)
        try {
          const [{ db }]: any = await this.publicByContactRepository.query(
            'SELECT DATABASE() AS db',
          );
          const canSetPbcSend = await this.hasColumn(
            db,
            'public_by_contacts',
            'send',
          );
          const canSetPbcHasError = await this.hasColumn(
            db,
            'public_by_contacts',
            'has_error',
          );
          const pbcUpdates: any = {};
          if (canSetPbcSend) pbcUpdates.send = 1;
          if (canSetPbcHasError) pbcUpdates.has_error = 0;
          if (Object.keys(pbcUpdates).length > 0) {
            await this.publicByContactRepository
              .createQueryBuilder()
              .update('public_by_contacts')
              .set(pbcUpdates)
              .where(
                'contact_id IN (SELECT id FROM contacts WHERE number = :phone)',
                {
                  phone: phoneNumber,
                },
              )
              .execute();
          }
        } catch (e) {
          this.logger.warn(
            '⚠️ Não foi possível atualizar public_by_contacts (colunas ausentes?)',
          );
        }
      }

      this.logger.log('✅ message.sent processado', { phone: phoneNumber });
    } catch (error: unknown) {
      this.logger.error('❌ Erro ao processar message.sent', {
        error: error instanceof Error ? error.message : String(error),
      });
    }
  }

  /**
   * Handle session.status event
   * Atualiza status de conexão do número WhatsApp
   */
  private async handleSessionStatus(event: WahaWebhookEvent) {
    try {
      const payload = event.payload as SessionStatusPayload;

      this.logger.log('🔄 Processando session.status', {
        session: event.session,
        status: payload.status,
      });

      // Atualizar Number baseado no status
      const statusConnection = payload.status === 'WORKING' ? 1 : 0;

      await this.numberRepository.update(
        { instance: event.session },
        {
          status_connection: statusConnection,
          cel: payload.me?.id || null,
        },
      );

      this.logger.log('✅ session.status processado', {
        session: event.session,
        connected: statusConnection === 1,
      });
    } catch (error: unknown) {
      this.logger.error('❌ Erro ao processar session.status', {
        error: error instanceof Error ? error.message : String(error),
      });
    }
  }

  /**
   * Extract phone number from WAHA format
   * WAHA format: "5511999999999@c.us" -> "5511999999999"
   */
  private extractPhoneNumber(wahaPhone: string): string | null {
    if (!wahaPhone) return null;

    // Remove @c.us ou @g.us (group)
    const cleaned = wahaPhone.replace(/@.*$/, '');

    return cleaned;
  }

  // Helper: verifica se coluna existe no schema atual (compat MySQL/MariaDB)
  private async hasColumn(
    dbName: string,
    table: string,
    column: string,
  ): Promise<boolean> {
    const rows = await this.messageByContactRepository.query(
      'SELECT 1 FROM information_schema.COLUMNS WHERE TABLE_SCHEMA = ? AND TABLE_NAME = ? AND COLUMN_NAME = ? LIMIT 1',
      [dbName, table, column],
    );
    return Array.isArray(rows) && rows.length > 0;
  }
}
