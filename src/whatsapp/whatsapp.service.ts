import {
  Injectable,
  Logger,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Number } from '../database/entities/number.entity';
import { WahaService } from './waha.service';
import { UpdateSettingsDto } from './dto/update-settings.dto';
import { SendPollDto } from './dto/send-poll.dto';

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

      const sessionStatus = await this.wahaService.getSessionStatus(sessionName);

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
    this.logger.log('📥 Webhook recebido', { payload });

    try {
      // TODO: Process webhook events
      // - Message received
      // - Message sent
      // - Session status change
      // - etc.

      return {
        success: true,
        message: 'Webhook processado',
      };
    } catch (error: unknown) {
      this.logger.error('❌ Erro ao processar webhook', {
        error: error instanceof Error ? error.message : String(error),
      });
      throw error;
    }
  }
}
