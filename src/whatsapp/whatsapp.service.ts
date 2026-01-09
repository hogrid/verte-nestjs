import {
  BadRequestException,
  Inject,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Campaign } from '../database/entities/campaign.entity';
import { MessageByContact } from '../database/entities/message-by-contact.entity';
import { Number } from '../database/entities/number.entity';
import { PublicByContact } from '../database/entities/public-by-contact.entity';
import {
  SendImageMessageDto,
  SendTemplateMessageDto,
  SendTextMessageDto,
} from './dto/send-message.dto';
import { SetupWhatsAppDto } from './dto/setup-whatsapp.dto';
import type { IWhatsAppProvider } from './providers/whatsapp-provider.interface';
import { WHATSAPP_PROVIDER } from './providers/whatsapp-provider.interface';
import { InstanceManagerService } from './instance-manager.service';
import { ContactsService } from '../contacts/contacts.service';
import { Observable, Subject } from 'rxjs';
import { Client as PgClient } from 'pg';

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
  private readonly statusSubject = new Subject<{
    instanceName: string;
    status: 'connected' | 'disconnected';
  }>();

  constructor(
    @InjectRepository(Number)
    private readonly numberRepository: Repository<Number>,
    @InjectRepository(MessageByContact)
    private readonly messageByContactRepository: Repository<MessageByContact>,
    @InjectRepository(PublicByContact)
    private readonly publicByContactRepository: Repository<PublicByContact>,
    @InjectRepository(Campaign)
    private readonly campaignRepository: Repository<Campaign>,
    @Inject(WHATSAPP_PROVIDER)
    private readonly whatsappProvider: IWhatsAppProvider,
    private readonly instanceManager: InstanceManagerService,
    private readonly contactsService: ContactsService,
  ) {
    this.logger.log(
      `📱 WhatsappService initialized with provider: ${this.whatsappProvider.providerName} (${this.whatsappProvider.providerVersion})`,
    );
  }

  onStatus(): Observable<{
    instanceName: string;
    status: 'connected' | 'disconnected';
  }> {
    return this.statusSubject.asObservable();
  }

  onStatusForUser(userId: number): Observable<{
    instanceName: string;
    status: 'connected' | 'disconnected';
  }> {
    return new Observable((subscriber) => {
      (async () => {
        try {
          const number = await this.numberRepository.findOne({
            where: { user_id: userId, status: 1 },
          });
          if (number?.instance) {
            subscriber.next({
              instanceName: number.instance,
              status:
                number.status_connection === 1 ? 'connected' : 'disconnected',
            });
          }
        } catch (error) {
          // ignore error during initial status check
        }
      })();

      const sub = this.statusSubject.subscribe((payload) => {
        void (async () => {
          try {
            const number = await this.numberRepository.findOne({
              where: { instance: payload.instanceName },
            });
            if (number?.user_id === userId) subscriber.next(payload);
          } catch (error) {
            // ignore error during status update
          }
        })();
      });

      return () => sub.unsubscribe();
    });
  }

  /**
   * Setup WhatsApp - Criar instância e gerar QR Code
   * Agora com gerenciamento automático de instâncias corrompidas!
   */
  async setupWhatsApp(userId: number, dto: SetupWhatsAppDto) {
    this.logger.log('🔌 Configurando WhatsApp', { userId, dto });

    try {
      const instanceName = dto.instanceName || `user_${userId}_whatsapp`;

      const evolutionWebhookUrl = process.env.EVOLUTION_API_WEBHOOK_URL;
      const appUrl = process.env.APP_URL;
      const webhookUrl =
        evolutionWebhookUrl ||
        (appUrl ? `${appUrl}/api/v1/whatsapp/webhook` : undefined);

      if (!webhookUrl) {
        this.logger.warn(
          '⚠️  URL de webhook não configurada (EVOLUTION_API_WEBHOOK_URL ou APP_URL). A atualização de QR Code pode falhar.',
        );
      }

      // 🛡️ NOVO: Garantir instância saudável antes de criar/obter QR Code
      // Faz health check, recovery automático ou cleanup se necessário
      this.logger.log(`🛡️ Verificando saúde da instância: ${instanceName}`);
      const ensureResult =
        await this.instanceManager.ensureHealthyInstance(instanceName);

      if (ensureResult.cleaned) {
        this.logger.log(
          `✅ Instância corrompida foi automaticamente limpa e resetada`,
        );
      } else if (ensureResult.recovered) {
        this.logger.log(`✅ Instância foi automaticamente recuperada`);
      } else if (ensureResult.healthy) {
        this.logger.log(`✅ Instância já estava saudável`);
      } else {
        this.logger.warn(
          `⚠️ Não foi possível garantir instância saudável, continuando com cautela...`,
        );
      }

      // Provider agora lida com instância existente, apenas chamamos criar/obter.
      const instanceInfo = await this.whatsappProvider.createInstance({
        instanceName,
        qrcode: true,
        webhookUrl: webhookUrl,
      });

      this.logger.log('✅ Informações da instância obtidas do provider', {
        instanceName,
      });

      let number = await this.numberRepository.findOne({
        where: { user_id: userId, status: 1 },
      });

      if (!number) {
        number = this.numberRepository.create({
          user_id: userId,
          name: dto.name || 'WhatsApp Principal',
          instance: instanceName,
          status: 1,
          status_connection: 0,
        });
      }

      // Atualizar com as informações mais recentes
      number.instance = instanceName;
      number.status_connection = instanceInfo.status === 'connected' ? 1 : 0;
      number.qrcode = instanceInfo.qrCode || null;
      if (dto.name) number.name = dto.name;

      // Salvar pairing code se existir
      if (instanceInfo.pairingCode) {
        // Supondo que você adicione uma coluna `pairing_code` na entidade `Number`
        // number.pairing_code = instanceInfo.pairingCode;
      }

      await this.numberRepository.save(number);

      this.logger.log('✅ WhatsApp configurado com sucesso', {
        number_id: number.id,
        instanceName,
        qrCode: instanceInfo.qrCode ? 'presente' : 'ausente',
        pairingCode: instanceInfo.pairingCode ? 'presente' : 'ausente',
      });

      return {
        success: true,
        message:
          instanceInfo.status === 'connected'
            ? 'WhatsApp conectado com sucesso'
            : 'WhatsApp configurado. Escaneie o QR Code para conectar.',
        number: {
          id: number.id,
          name: number.name,
          instance_name: instanceName,
          qr_code: instanceInfo.qrCode,
          pairing_code: instanceInfo.pairingCode,
          status: instanceInfo.status,
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
   *
   * INTELIGENTE: Se QR Code não estiver no banco, regenera automaticamente
   * Isso resolve casos onde instância foi deletada ou QR Code expirou
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

      if (number.status_connection === 1) {
        return {
          success: true,
          qr_code: null,
          instance_name: number.instance,
          message: 'Instância já conectada',
        };
      }

      if (!number.qrcode || number.qrcode.length === 0) {
        this.logger.log(
          `🔄 QR Code não encontrado no banco, regenerando automaticamente...`,
        );

        // Garantir instância saudável
        const ensureResult = await this.instanceManager.ensureHealthyInstance(
          number.instance,
        );

        if (ensureResult.cleaned) {
          this.logger.log(`✅ Instância foi limpa e resetada`);
        }

        // Recriar instância e obter novo QR Code
        const webhookUrl =
          process.env.EVOLUTION_API_WEBHOOK_URL ||
          (process.env.APP_URL
            ? `${process.env.APP_URL}/api/v1/whatsapp/webhook`
            : undefined);

        const instanceInfo = await this.whatsappProvider.createInstance({
          instanceName: number.instance,
          qrcode: true,
          webhookUrl: webhookUrl,
        });

        // NOVO: Se createInstance não retornou QR Code, buscar via connectInstance
        if (!instanceInfo.qrCode) {
          this.logger.log(
            '🔄 QR Code não veio do createInstance, buscando via connectInstance...',
          );

          try {
            const qrResponse = await this.whatsappProvider.connectInstance(
              number.instance,
            );

            if (qrResponse.base64) {
              await this.numberRepository.update(number.id, {
                qrcode: qrResponse.base64,
                status_connection: 0,
              });

              this.logger.log('✅ QR Code obtido via connectInstance');

              return {
                success: true,
                qr_code: qrResponse.base64,
                instance_name: number.instance,
              };
            }
          } catch (connectError) {
            this.logger.warn(
              '⚠️ Erro ao buscar QR Code via connectInstance:',
              connectError,
            );
          }
        }

        // Salvar novo QR Code no banco
        if (instanceInfo.qrCode) {
          await this.numberRepository.update(number.id, {
            qrcode: instanceInfo.qrCode,
            status_connection: 0,
          });

          this.logger.log(`✅ Novo QR Code gerado e salvo no banco`);

          return {
            success: true,
            qr_code: instanceInfo.qrCode,
            instance_name: number.instance,
          };
        }
      }

      // Retornar QR Code do banco
      return {
        success: true,
        qr_code: number.qrcode,
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

      const instanceInfo = await this.whatsappProvider.getInstanceStatus(
        number.instance,
      );

      let connected = instanceInfo.status === 'connected';
      let status = instanceInfo.status;
      let phone = instanceInfo.phoneNumber;
      let profile = instanceInfo.profileName;

      // SEMPRE buscar dados do Evolution Postgres (número e perfil)
      try {
        const pgUri =
          process.env.EVOLUTION_PG_URI ||
          'postgres://postgres:postgres@localhost:5433/evolution';
        const pg = new PgClient({ connectionString: pgUri });
        await pg.connect();
        const res = await pg.query(
          'SELECT "ownerJid", "profileName", "profilePicUrl" FROM "Instance" WHERE name = $1 LIMIT 1',
          [number.instance],
        );
        const row = res.rows?.[0];
        await pg.end();
        if (row) {
          // ownerJid é no formato "5511999999999@s.whatsapp.net"
          if (row.ownerJid) {
            phone = row.ownerJid.replace(/@.*/, '');
          }
          profile = row.profileName || profile;
          this.logger.log(`📱 Dados do Evolution: phone=${phone}, profile=${profile}`);
        }
      } catch (error) {
        this.logger.warn('⚠️ Erro ao buscar dados do Evolution Postgres:', error);
      }

      const connectionStatus = connected ? 1 : 0;
      await this.numberRepository.update(number.id, {
        status_connection: connectionStatus,
        cel: phone || number.cel,
        qrcode: connectionStatus === 1 ? null : number.qrcode,
      });

      this.statusSubject.next({
        instanceName: number.instance,
        status: connectionStatus === 1 ? 'connected' : 'disconnected',
      });

      if (connectionStatus === 1) {
        void this.contactsService
          .syncFromEvolution(number.user_id)
          .catch(() => undefined);
      }

      return {
        connected,
        status,
        phone_number: phone,
        profile_name: profile,
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
        this.logger.warn(
          '⚠️ Provider não suporta templates. Enviando como texto.',
        );
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
          instance: number.instance,
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
      this.logger.log('📥 Webhook recebido', { event: payload?.event });

      if (this.whatsappProvider.processWebhook && payload?.event) {
        const processed = await this.whatsappProvider.processWebhook(payload);

        if (processed.type !== 'other') {
          if (processed.type === 'qrcode')
            await this.handleQRCodeEvent(processed.data);
          if (processed.type === 'connection')
            await this.handleConnectionEvent(processed.data);
          if (processed.type === 'contacts') {
            const instanceName = processed.data?.instanceName;
            if (instanceName) {
              const number = await this.numberRepository.findOne({
                where: { instance: instanceName },
              });
              if (number) {
                try {
                  this.contactsService
                    .syncFromEvolution(number.user_id)
                    .catch(() => undefined);
                } catch (error) {
                  this.logger.warn(
                    `Erro ao disparar sync de contatos: ${error instanceof Error ? error.message : String(error)}`,
                  );
                }
              }
            }
          }
          return { success: true, message: 'Webhook processado' };
        } else {
          this.logger.log(
            'Webhook classificado como "other", tentando processamento legado/WAHA...',
          );
        }
      }

      // Legado / WAHA compatibility
      if (payload?.event && payload?.session && payload?.payload) {
        this.logger.log(
          `Processando webhook legado: ${payload.event} para sessão ${payload.session}`,
        );

        const event: string = payload.event;
        const session: string = payload.session;
        const data: any = payload.payload;

        if (event === 'message.ack') {
          await this.processMessageAck(data);
        } else if (event === 'message.sent') {
          await this.processMessageSent(data);
        } else if (event === 'session.status') {
          await this.processSessionStatus(session, data);
        } else if (event === 'message.any') {
          this.logger.log('📨 message.any recebido');
          await this.processIncomingMessage(data);
        }
        return { success: true, message: 'Webhook processado' };
      }

      return { success: false, message: 'Estrutura de webhook inválida' };
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
   * Handle QR Code event from webhook
   */
  private async handleQRCodeEvent(data: any) {
    try {
      const { instanceName, qrCode } = data;

      if (!instanceName || !qrCode) {
        this.logger.warn('⚠️ QR Code event inválido:', data);
        return;
      }

      this.logger.log(`🔥 Salvando QR Code para instância: ${instanceName}`);

      // Buscar número pela instância
      const number = await this.numberRepository.findOne({
        where: { instance: instanceName },
      });

      if (!number) {
        this.logger.warn(
          `⚠️ Número não encontrado para instância: ${instanceName}`,
        );
        return;
      }

      // Atualizar QR Code no banco
      await this.numberRepository.update(number.id, {
        qrcode: qrCode,
      });

      this.logger.log(`✅ QR Code salvo no banco para number_id: ${number.id}`);
    } catch (error: unknown) {
      this.logger.error('❌ Erro ao processar QR Code event', {
        error: error instanceof Error ? error.message : String(error),
      });
    }
  }

  /**
   * Handle connection event from webhook
   */
  private async handleConnectionEvent(data: any) {
    try {
      const { instanceName, state, statusReason } = data;

      if (!instanceName) {
        this.logger.warn(
          '⚠️ Connection event inválido (sem instanceName):',
          data,
        );
        return;
      }

      this.logger.log(
        `🔌 Processando evento de conexão para ${instanceName}:`,
        {
          state,
          statusReason,
        },
      );

      // Buscar número pela instância
      const number = await this.numberRepository.findOne({
        where: { instance: instanceName },
      });

      if (!number) {
        this.logger.warn(
          `⚠️ Número não encontrado para instância: ${instanceName}`,
        );
        return;
      }

      // Mapear estado para status_connection
      // 'open' = conectado (1), outros estados = desconectado (0)
      let statusConnection = 0;
      if (state === 'open') {
        statusConnection = 1;
      }

      // Atualizar status no banco
      await this.numberRepository.update(number.id, {
        status_connection: statusConnection,
      });
      this.statusSubject.next({
        instanceName,
        status: statusConnection === 1 ? 'connected' : 'disconnected',
      });

      this.logger.log(
        `✅ Status de conexão atualizado para number_id ${number.id}: ${statusConnection === 1 ? 'CONECTADO' : 'DESCONECTADO'}`,
      );

      // Se conectado, buscar número de telefone
      if (statusConnection === 1) {
        try {
          const instanceInfo =
            await this.whatsappProvider.getInstanceStatus(instanceName);

          if (instanceInfo.phoneNumber) {
            await this.numberRepository.update(number.id, {
              cel: instanceInfo.phoneNumber,
            });
            this.logger.log(
              `✅ Número de telefone atualizado: ${instanceInfo.phoneNumber}`,
            );
          }
        } catch (error) {
          this.logger.warn(
            '⚠️ Não foi possível obter número de telefone (continuando...)',
          );
        }

        // Atualizar foto e nome a partir do Evolution (Instance)
        try {
          const pgUri =
            process.env.EVOLUTION_PG_URI ||
            'postgres://postgres:postgres@localhost:5433/evolution';
          const pg = new PgClient({ connectionString: pgUri });
          await pg.connect();
          const res = await pg.query(
            'SELECT "profilePicUrl", "profileName", "ownerJid" FROM "Instance" WHERE name = $1 LIMIT 1',
            [instanceName],
          );
          const row = res.rows?.[0];
          if (row) {
            // ownerJid é no formato "5511999999999@s.whatsapp.net"
            const phoneNumber = row.ownerJid
              ? row.ownerJid.replace(/@.*/, '')
              : number.cel;
            await this.numberRepository.update(number.id, {
              photo: row.profilePicUrl || number.photo,
              name: row.profileName || number.name,
              cel: phoneNumber || number.cel,
            });
            this.logger.log('🖼️ Perfil atualizado a partir do Evolution', {
              profileName: row.profileName,
            });
          }
          await pg.end();
        } catch (error) {
          // ignore error
        }

        try {
          void this.contactsService
            .syncFromEvolution(number.user_id)
            .catch(() => undefined);
        } catch (error) {
          // ignore error
        }
      }
    } catch (error: unknown) {
      this.logger.error('❌ Erro ao processar connection event', {
        error: error instanceof Error ? error.message : String(error),
      });
    }
  }

  async disconnect(userId: number) {
    const number = await this.numberRepository.findOne({
      where: { user_id: userId, status: 1 },
    });
    if (!number || !number.instance) {
      throw new NotFoundException('Número não encontrado');
    }
    await this.deleteAndReset(number.instance, number.id);
    return { success: true };
  }

  /**
   * Desconectar por nome da instância (logout)
   * Usa disconnectInstance em vez de deleteInstance
   * Mantém a instância para possível reconexão futura
   */
  async disconnectByName(instanceName: string, userId: number) {
    this.logger.log('🔌 Desconectando instância por nome', { instanceName, userId });

    // Validar propriedade da instância
    const number = await this.numberRepository.findOne({
      where: { user_id: userId, instance: instanceName, status: 1 },
    });

    if (!number) {
      throw new NotFoundException('Instância não encontrada ou não pertence a este usuário');
    }

    // Desconectar (logout) - mantém instância para reconexão futura
    try {
      await this.whatsappProvider.disconnectInstance(instanceName);
      this.logger.log(`✅ Instância desconectada via Evolution API: ${instanceName}`);
    } catch (error) {
      this.logger.warn(
        `⚠️ Erro ao desconectar instância no Evolution API: ${error instanceof Error ? error.message : String(error)}`,
      );
      // Continuar mesmo se erro no Evolution API
      // Apenas atualizamos o banco de dados
    }

    // Atualizar status no banco
    await this.numberRepository.update(number.id, {
      status_connection: 0,
    });

    // Emitir evento de desconexão
    this.statusSubject.next({
      instanceName,
      status: 'disconnected',
    });

    this.logger.log(`✅ Status de desconexão salvo no banco para instância: ${instanceName}`);

    // Limpar todos os contatos do usuário ao desconectar
    try {
      this.logger.log(`🗑️ Limpando contatos do usuário ${userId}...`);
      const deleteResult = await this.contactsService.removeAll(userId);
      this.logger.log(`✅ Contatos removidos: ${deleteResult?.data?.deleted || 0}`);
    } catch (contactsError) {
      this.logger.warn(
        `⚠️ Erro ao limpar contatos (continuando...): ${contactsError instanceof Error ? contactsError.message : String(contactsError)}`,
      );
      // Não falhar a desconexão se falhar ao limpar contatos
    }

    return {
      success: true,
      message: 'Desconectado com sucesso',
    };
  }

  private async deleteAndReset(instanceName: string, numberId: number) {
    try {
      await this.whatsappProvider.deleteInstance(instanceName);
    } catch (error) {
      // ignore error
    }
    await this.numberRepository.update(numberId, {
      status_connection: 0,
      qrcode: null,
    });
    this.statusSubject.next({ instanceName, status: 'disconnected' });
  }

  async getProfileInfo(userId: number) {
    const number = await this.numberRepository.findOne({
      where: { user_id: userId, status: 1 },
    });
    if (!number || !number.instance) {
      throw new NotFoundException('Número ativo não encontrado.');
    }
    const status = await this.whatsappProvider.getInstanceStatus(
      number.instance,
    );
    let phone: string | null = status.phoneNumber || null;
    let profileName: string | null = status.profileName || null;
    let profilePicUrl: string | null = null;
    try {
      const pgUri =
        process.env.EVOLUTION_PG_URI ||
        'postgres://postgres:postgres@localhost:5433/evolution';
      const pg = new PgClient({ connectionString: pgUri });
      await pg.connect();
      const res = await pg.query(
        'SELECT name, "ownerJid", "profileName", "profilePicUrl" FROM "Instance" WHERE name = $1 LIMIT 1',
        [number.instance],
      );
      const row = res.rows?.[0] || {};
      // ownerJid é no formato "5511999999999@s.whatsapp.net"
      phone = row.ownerJid ? row.ownerJid.replace(/@.*/, '') : phone;
      profileName = row.profileName || profileName;
      profilePicUrl = row.profilePicUrl || profilePicUrl;
      await pg.end();
    } catch (error) {
      // ignore error
    }
    return {
      connected: status.status === 'connected',
      instance_name: number.instance,
      phone_number: phone,
      profile_name: profileName,
      profile_pic_url: profilePicUrl,
    };
  }

  /**
   * Buscar dados completos da instância WhatsApp
   * Faz proxy para Evolution API: GET /instance/fetchInstances
   */
  async fetchInstanceData(userId: number, instanceName: string) {
    this.logger.log('📋 Buscando dados da instância', { userId, instanceName });

    try {
      // Verificar se usuário tem acesso a essa instância
      const number = await this.numberRepository.findOne({
        where: { user_id: userId, instance: instanceName, status: 1 },
      });

      if (!number) {
        throw new NotFoundException(
          'Instância não encontrada ou não pertence a este usuário',
        );
      }

      // Buscar dados completos via Evolution API
      // EvolutionApiProvider deve ter o método fetchInstances implementado
      if (
        this.whatsappProvider.providerName === 'evolution-api' &&
        'fetchInstances' in this.whatsappProvider
      ) {
        const instanceData = await (
          this.whatsappProvider as any
        ).fetchInstances(instanceName);

        if (!instanceData) {
          throw new NotFoundException('Instância não encontrada na Evolution API');
        }

        // Mapear resposta da Evolution API para o formato esperado pelo frontend
        return {
          instanceName: instanceData.instanceName || instanceData.name,
          instanceId: instanceData.instanceId || instanceData.id,
          owner: instanceData.owner,
          profileName: instanceData.profileName,
          profilePictureUrl: instanceData.profilePictureUrl || instanceData.profilePicUrl,
          profileStatus: instanceData.profileStatus,
          status: instanceData.status || instanceData.state,
          integration: instanceData.integration,
          serverUrl: instanceData.serverUrl,
          phoneNumber: instanceData.phoneNumber || instanceData.number,
          createdAt: instanceData.createdAt || instanceData.created_at,
          updatedAt: instanceData.updatedAt || instanceData.updated_at,
        };
      }

      throw new BadRequestException(
        'Provider atual não suporta fetchInstances',
      );
    } catch (error: unknown) {
      this.logger.error('❌ Erro ao buscar dados da instância', {
        error: error instanceof Error ? error.message : String(error),
      });
      throw error;
    }
  }

  private async columnExists(table: string, column: string): Promise<boolean> {
    try {
      const rows = await this.messageByContactRepository.query(
        'SELECT 1 FROM information_schema.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = ? AND COLUMN_NAME = ? LIMIT 1',
        [table, column],
      );
      return Array.isArray(rows) && rows.length > 0;
    } catch {
      return false;
    }
  }

  private extractNumberFromJid(jid?: string): string | null {
    if (!jid || typeof jid !== 'string') return null;
    return jid.replace(/@c\.us.*/i, '');
  }

  private async processMessageAck(ackPayload: any) {
    const toNumberJid = ackPayload?.to;
    const ack = ackPayload?.ack;
    const contactNumber = this.extractNumberFromJid(toNumberJid);
    if (!contactNumber) return;

    const contactRow = await this.publicByContactRepository.query(
      'SELECT id FROM contacts WHERE number = ? LIMIT 1',
      [contactNumber],
    );
    const contactId = contactRow?.[0]?.id;
    if (!contactId) return;

    // Build dynamic sets for message_by_contacts
    const setsMbc: string[] = [];
    if (await this.columnExists('message_by_contacts', 'send')) {
      if (typeof ack === 'number' && ack >= 2) setsMbc.push('`send` = 1');
    }
    if (await this.columnExists('message_by_contacts', 'delivered')) {
      if (typeof ack === 'number' && ack >= 3) setsMbc.push('delivered = 1');
    }
    if (await this.columnExists('message_by_contacts', 'read')) {
      if (typeof ack === 'number' && ack >= 4) setsMbc.push('`read` = 1');
    }
    if (await this.columnExists('message_by_contacts', 'error')) {
      if (ack === 0) setsMbc.push("error = 'Erro ao enviar mensagem'");
    }

    if (setsMbc.length > 0) {
      await this.messageByContactRepository.query(
        `UPDATE message_by_contacts SET ${setsMbc.join(', ')} WHERE contact_id = ? ORDER BY id DESC LIMIT 1`,
        [contactId],
      );
    }

    // Atualizar estatísticas da campanha baseado no ack
    // Buscar o message_by_contact mais recente para obter o campaign_id
    try {
      const mbcRow = await this.messageByContactRepository.query(
        `SELECT mbc.id, m.campaign_id
         FROM message_by_contacts mbc
         INNER JOIN messages m ON mbc.message_id = m.id
         WHERE mbc.contact_id = ?
         ORDER BY mbc.id DESC LIMIT 1`,
        [contactId],
      );

      const campaignId = mbcRow?.[0]?.campaign_id;
      if (campaignId && typeof ack === 'number') {
        // ack >= 3: delivered
        if (ack >= 3) {
          await this.campaignRepository.increment({ id: campaignId }, 'total_delivered', 1);
          this.logger.debug(`📬 Campanha #${campaignId}: +1 entregue`);
        }
        // ack >= 4: read
        if (ack >= 4) {
          await this.campaignRepository.increment({ id: campaignId }, 'total_read', 1);
          this.logger.debug(`👁️ Campanha #${campaignId}: +1 lido`);
        }
      }
    } catch (error) {
      this.logger.warn('Erro ao atualizar estatísticas da campanha:', error);
    }

    // public_by_contacts flags
    const setsPbc: string[] = [];
    if (await this.columnExists('public_by_contacts', 'send')) {
      if (typeof ack === 'number' && ack >= 2) setsPbc.push('`send` = 1');
    }
    if (await this.columnExists('public_by_contacts', 'read')) {
      if (typeof ack === 'number' && ack >= 4) setsPbc.push('`read` = 1');
    }
    if (await this.columnExists('public_by_contacts', 'has_error')) {
      if (ack === 0) setsPbc.push('has_error = 1');
    }
    if (setsPbc.length > 0) {
      await this.publicByContactRepository.query(
        `UPDATE public_by_contacts SET ${setsPbc.join(', ')} WHERE contact_id = ? ORDER BY id DESC LIMIT 1`,
        [contactId],
      );
    }
  }

  private async processMessageSent(sentPayload: any) {
    const toNumberJid = sentPayload?.to;
    const contactNumber = this.extractNumberFromJid(toNumberJid);
    if (!contactNumber) return;
    const contactRow = await this.publicByContactRepository.query(
      'SELECT id FROM contacts WHERE number = ? LIMIT 1',
      [contactNumber],
    );
    const contactId = contactRow?.[0]?.id;
    if (!contactId) return;

    if (await this.columnExists('message_by_contacts', 'send')) {
      await this.messageByContactRepository.query(
        'UPDATE message_by_contacts SET `send` = 1 WHERE contact_id = ? ORDER BY id DESC LIMIT 1',
        [contactId],
      );
    }
    if (await this.columnExists('public_by_contacts', 'send')) {
      await this.publicByContactRepository.query(
        'UPDATE public_by_contacts SET `send` = 1 WHERE contact_id = ? ORDER BY id DESC LIMIT 1',
        [contactId],
      );
    }
    if (await this.columnExists('public_by_contacts', 'has_error')) {
      await this.publicByContactRepository.query(
        'UPDATE public_by_contacts SET has_error = 0 WHERE contact_id = ? ORDER BY id DESC LIMIT 1',
        [contactId],
      );
    }
  }

  private async processSessionStatus(sessionName: string, statusPayload: any) {
    const status = statusPayload?.status;
    const meId = statusPayload?.me?.id;
    const number = await this.numberRepository.findOne({
      where: { instance: sessionName },
    });
    if (!number) return;

    if (status === 'WORKING') {
      await this.numberRepository.update(number.id, {
        status_connection: 1,
        cel: meId || number.cel,
      });
      this.statusSubject.next({
        instanceName: sessionName,
        status: 'connected',
      });
      try {
        void this.contactsService
          .syncFromEvolution(number.user_id)
          .catch(() => undefined);
      } catch (_e) {
        this.logger.warn('syncFromEvolution failed');
      }
    } else if (
      status === 'SCAN_QR_CODE' ||
      status === 'FAILED' ||
      status === 'STOPPED'
    ) {
      await this.numberRepository.update(number.id, {
        status_connection: 0,
      });
      this.statusSubject.next({
        instanceName: sessionName,
        status: 'disconnected',
      });
    }
  }

  /**
   * Processa mensagens recebidas para rastrear interações de campanhas
   * Quando um contato responde a uma mensagem de campanha, incrementa total_interactions
   */
  private async processIncomingMessage(messagePayload: any) {
    try {
      // Extrair número do remetente
      const fromJid = messagePayload?.from || messagePayload?.key?.remoteJid;
      const senderNumber = this.extractNumberFromJid(fromJid);

      if (!senderNumber) return;

      // Verificar se é uma mensagem recebida (não enviada por nós)
      const fromMe = messagePayload?.key?.fromMe || messagePayload?.fromMe;
      if (fromMe) return;

      // Buscar contato pelo número
      const contactRow = await this.publicByContactRepository.query(
        'SELECT id FROM contacts WHERE number = ? LIMIT 1',
        [senderNumber],
      );
      const contactId = contactRow?.[0]?.id;
      if (!contactId) return;

      // Buscar campanhas ativas que enviaram mensagem para este contato recentemente
      // (últimas 24 horas para considerar como interação)
      const result = await this.messageByContactRepository.query(
        `SELECT DISTINCT m.campaign_id
         FROM message_by_contacts mbc
         INNER JOIN messages m ON mbc.message_id = m.id
         INNER JOIN campaigns c ON m.campaign_id = c.id
         WHERE mbc.contact_id = ?
         AND mbc.send = 1
         AND c.status IN (0, 1, 2)
         AND mbc.created_at >= DATE_SUB(NOW(), INTERVAL 24 HOUR)
         ORDER BY mbc.created_at DESC
         LIMIT 1`,
        [contactId],
      );

      const campaignId = result?.[0]?.campaign_id;
      if (campaignId) {
        await this.campaignRepository.increment(
          { id: campaignId },
          'total_interactions',
          1,
        );
        this.logger.log(
          `💬 Interação registrada na campanha #${campaignId} do contato ${senderNumber.substring(0, 8)}***`,
        );
      }
    } catch (error) {
      this.logger.warn('Erro ao processar mensagem recebida:', error);
    }
  }
}
