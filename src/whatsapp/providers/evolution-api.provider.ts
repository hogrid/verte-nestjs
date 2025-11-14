import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import axios, { AxiosInstance } from 'axios';
import {
  IWhatsAppProvider,
  WhatsAppInstanceInfo,
  CreateInstanceOptions,
  SendMessageResult,
  SendTextOptions,
  SendMediaOptions,
  SendTemplateOptions,
} from './whatsapp-provider.interface';

/**
 * EvolutionApiProvider
 *
 * Implementação do IWhatsAppProvider para Evolution API
 *
 * Documentação: https://doc.evolution-api.com/v2
 *
 * Funcionalidades:
 * - ✅ Múltiplas instâncias (cada usuário com seu WhatsApp)
 * - ✅ QR Code para conexão
 * - ✅ Envio de texto, imagens, vídeos, documentos
 * - ✅ Webhooks para eventos
 * - ✅ Status de conexão em tempo real
 * - ✅ Open-source e auto-hospedável
 */
@Injectable()
export class EvolutionApiProvider implements IWhatsAppProvider {
  private readonly logger = new Logger(EvolutionApiProvider.name);
  private readonly httpClient: AxiosInstance;
  private readonly baseUrl: string;
  private readonly globalApiKey: string;

  readonly providerName = 'evolution-api';
  readonly providerVersion = 'v2';

  constructor(private readonly configService: ConfigService) {
    this.baseUrl =
      this.configService.get<string>('EVOLUTION_API_URL') ||
      'http://localhost:8080';
    this.globalApiKey =
      this.configService.get<string>('EVOLUTION_API_KEY') || '';

    this.httpClient = axios.create({
      baseURL: this.baseUrl,
      headers: {
        'Content-Type': 'application/json',
        apikey: this.globalApiKey,
      },
      timeout: 30000,
    });

    this.logger.log(`✅ Evolution API Provider initialized: ${this.baseUrl}`);
  }

  // ==================== Instance Management ====================

  async createInstance(
    options: CreateInstanceOptions,
  ): Promise<WhatsAppInstanceInfo> {
    this.logger.log(`📱 Criando instância: ${options.instanceName}`);

    try {
      const payload = {
        instanceName: options.instanceName,
        integration: options.integration || 'WHATSAPP-BAILEYS',
        qrcode: options.qrcode ?? true,
        ...(options.webhookUrl && {
          webhook: {
            url: options.webhookUrl,
            events: options.webhookEvents || [
              'MESSAGES_UPSERT',
              'MESSAGES_UPDATE',
              'CONNECTION_UPDATE',
              'QRCODE_UPDATED',
            ],
          },
        }),
      };

      const response = await this.httpClient.post('/instance/create', payload);

      this.logger.log(`✅ Instância criada: ${options.instanceName}`);

      // Aguardar QR Code ser gerado
      if (options.qrcode) {
        await this.sleep(2000); // 2 segundos para gerar QR
      }

      return {
        instanceName: options.instanceName,
        status: 'qr',
        qrCode: response.data.qrcode?.base64,
      };
    } catch (error: any) {
      this.logger.error(`❌ Erro ao criar instância`, {
        error: error.response?.data || error.message,
      });
      throw new Error(
        `Falha ao criar instância: ${error.response?.data?.message || error.message}`,
      );
    }
  }

  async getInstanceStatus(
    instanceName: string,
  ): Promise<WhatsAppInstanceInfo> {
    this.logger.log(`🔍 Verificando status: ${instanceName}`);

    try {
      const response = await this.httpClient.get(
        `/instance/connectionState/${instanceName}`,
      );

      const state = response.data.state;
      let status: 'connected' | 'disconnected' | 'connecting' | 'qr' =
        'disconnected';

      if (state === 'open') {
        status = 'connected';
      } else if (state === 'connecting') {
        status = 'connecting';
      } else if (state === 'close') {
        status = 'disconnected';
      }

      // Obter informações do número se conectado
      let phoneNumber: string | undefined;
      let profileName: string | undefined;

      if (status === 'connected') {
        try {
          const infoResponse = await this.httpClient.get(
            `/instance/fetchInstances/${instanceName}`,
          );
          phoneNumber = infoResponse.data.instance?.owner;
          profileName = infoResponse.data.instance?.profileName;
        } catch (error) {
          this.logger.warn(`⚠️ Não foi possível obter info da instância`);
        }
      }

      return {
        instanceName,
        status,
        phoneNumber,
        profileName,
      };
    } catch (error: any) {
      this.logger.error(`❌ Erro ao verificar status`, {
        error: error.response?.data || error.message,
      });

      return {
        instanceName,
        status: 'disconnected',
      };
    }
  }

  async deleteInstance(instanceName: string): Promise<{ success: boolean }> {
    this.logger.log(`🗑️ Deletando instância: ${instanceName}`);

    try {
      await this.httpClient.delete(`/instance/delete/${instanceName}`);

      this.logger.log(`✅ Instância deletada: ${instanceName}`);

      return { success: true };
    } catch (error: any) {
      this.logger.error(`❌ Erro ao deletar instância`, {
        error: error.response?.data || error.message,
      });

      throw new Error(
        `Falha ao deletar instância: ${error.response?.data?.message || error.message}`,
      );
    }
  }

  async reconnectInstance(
    instanceName: string,
  ): Promise<WhatsAppInstanceInfo> {
    this.logger.log(`🔄 Reconectando instância: ${instanceName}`);

    try {
      await this.httpClient.put(`/instance/restart/${instanceName}`);

      // Aguardar reconexão
      await this.sleep(3000);

      return this.getInstanceStatus(instanceName);
    } catch (error: any) {
      this.logger.error(`❌ Erro ao reconectar instância`, {
        error: error.response?.data || error.message,
      });

      throw new Error(
        `Falha ao reconectar instância: ${error.response?.data?.message || error.message}`,
      );
    }
  }

  // ==================== QR Code ====================

  async getQRCode(instanceName: string): Promise<{ qr: string }> {
    this.logger.log(`📷 Obtendo QR Code: ${instanceName}`);

    try {
      const response = await this.httpClient.get(
        `/instance/connect/${instanceName}`,
      );

      const qrBase64 = response.data.base64;

      if (!qrBase64) {
        throw new Error('QR Code não disponível');
      }

      this.logger.log(`✅ QR Code obtido: ${instanceName}`);

      return { qr: qrBase64 };
    } catch (error: any) {
      this.logger.error(`❌ Erro ao obter QR Code`, {
        error: error.response?.data || error.message,
      });

      throw new Error(
        `Falha ao obter QR Code: ${error.response?.data?.message || error.message}`,
      );
    }
  }

  // ==================== Messaging ====================

  async sendText(
    instanceName: string,
    options: SendTextOptions,
  ): Promise<SendMessageResult> {
    this.logger.log(`📤 Enviando texto: ${instanceName} -> ${options.to}`);

    try {
      const payload = {
        number: this.formatPhoneNumber(options.to),
        text: options.text,
      };

      const response = await this.httpClient.post(
        `/message/sendText/${instanceName}`,
        payload,
      );

      this.logger.log(`✅ Texto enviado`, {
        messageId: response.data.key?.id,
      });

      return {
        success: true,
        messageId: response.data.key?.id || response.data.messageId,
        timestamp: response.data.messageTimestamp,
      };
    } catch (error: any) {
      this.logger.error(`❌ Erro ao enviar texto`, {
        error: error.response?.data || error.message,
      });

      throw new Error(
        `Falha ao enviar mensagem: ${error.response?.data?.message || error.message}`,
      );
    }
  }

  async sendMedia(
    instanceName: string,
    options: SendMediaOptions,
  ): Promise<SendMessageResult> {
    this.logger.log(
      `🖼️ Enviando mídia (${options.mediaType}): ${instanceName} -> ${options.to}`,
    );

    try {
      const payload = {
        number: this.formatPhoneNumber(options.to),
        mediatype: options.mediaType,
        media: options.mediaUrl,
        ...(options.caption && { caption: options.caption }),
        ...(options.fileName && { fileName: options.fileName }),
      };

      const response = await this.httpClient.post(
        `/message/sendMedia/${instanceName}`,
        payload,
      );

      this.logger.log(`✅ Mídia enviada`, {
        messageId: response.data.key?.id,
      });

      return {
        success: true,
        messageId: response.data.key?.id || response.data.messageId,
        timestamp: response.data.messageTimestamp,
      };
    } catch (error: any) {
      this.logger.error(`❌ Erro ao enviar mídia`, {
        error: error.response?.data || error.message,
      });

      throw new Error(
        `Falha ao enviar mídia: ${error.response?.data?.message || error.message}`,
      );
    }
  }

  // Evolution API não suporta templates (recurso do WhatsApp Business API)
  async sendTemplate?(
    instanceName: string,
    options: SendTemplateOptions,
  ): Promise<SendMessageResult> {
    this.logger.warn(
      `⚠️ Evolution API não suporta templates nativamente. Enviando como texto.`,
    );

    // Fallback: enviar como texto simples
    return this.sendText(instanceName, {
      to: options.to,
      text: `Template: ${options.templateName}`,
    });
  }

  // ==================== Webhooks ====================

  validateWebhook(payload: any, signature?: string): boolean {
    // Evolution API não usa assinatura de webhook por padrão
    // Validação pode ser feita via API Key no header
    this.logger.log(`🔍 Validando webhook`);
    return true;
  }

  async processWebhook(payload: any): Promise<{
    type: 'message' | 'status' | 'connection' | 'other';
    data: any;
  }> {
    this.logger.log(`📥 Processando webhook`, { event: payload.event });

    const event = payload.event;

    if (event === 'messages.upsert') {
      return {
        type: 'message',
        data: payload.data,
      };
    } else if (event === 'messages.update') {
      return {
        type: 'status',
        data: payload.data,
      };
    } else if (event === 'connection.update') {
      return {
        type: 'connection',
        data: payload.data,
      };
    } else if (event === 'qrcode.updated') {
      return {
        type: 'other',
        data: { qrCode: payload.data.qrcode },
      };
    }

    return {
      type: 'other',
      data: payload,
    };
  }

  // ==================== Health Check ====================

  async healthCheck(): Promise<{ healthy: boolean; message?: string }> {
    this.logger.log(`🏥 Health check`);

    try {
      const response = await this.httpClient.get('/');

      if (response.status === 200) {
        return {
          healthy: true,
          message: 'Evolution API is running',
        };
      }

      return {
        healthy: false,
        message: 'Unexpected response',
      };
    } catch (error: any) {
      this.logger.error(`❌ Health check failed`, {
        error: error.message,
      });

      return {
        healthy: false,
        message: error.message,
      };
    }
  }

  // ==================== Helpers ====================

  private formatPhoneNumber(phone: string): string {
    // Remove caracteres não numéricos
    let cleaned = phone.replace(/\D/g, '');

    // Adicionar código do país se não tiver
    if (!cleaned.startsWith('55') && cleaned.length === 11) {
      cleaned = '55' + cleaned;
    }

    return cleaned;
  }

  private sleep(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }
}
