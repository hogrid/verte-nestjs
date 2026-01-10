import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import axios, { AxiosInstance } from 'axios';
import * as crypto from 'crypto';

/**
 * WhatsAppCloudService
 *
 * Service para integração com WhatsApp Cloud API (Meta/Facebook)
 * Documentação: https://developers.facebook.com/docs/whatsapp/cloud-api
 *
 * Vantagens sobre WAHA:
 * - ✅ Suporta múltiplas sessões (cada usuário tem seu Phone Number ID)
 * - ✅ API oficial da Meta (mais estável e segura)
 * - ✅ Não precisa de QR Code (usa Phone Number ID + Access Token)
 * - ✅ Gratuito para mensagens de resposta (janela de 24h)
 */
@Injectable()
export class WhatsAppCloudService {
  private readonly logger = new Logger(WhatsAppCloudService.name);
  private readonly client: AxiosInstance;
  private readonly apiVersion: string;

  constructor(private readonly configService: ConfigService) {
    this.apiVersion = this.configService.get<string>(
      'WHATSAPP_API_VERSION',
      'v21.0',
    );

    // Create axios instance with base config
    this.client = axios.create({
      baseURL: `https://graph.facebook.com/${this.apiVersion}`,
      timeout: 30000, // 30 seconds
      headers: {
        'Content-Type': 'application/json',
      },
    });

    this.logger.log(
      `WhatsAppCloudService inicializado (API version: ${this.apiVersion})`,
    );
  }

  /**
   * Send text message
   * @param phoneNumberId - Business Phone Number ID
   * @param accessToken - Access Token
   * @param to - Recipient phone number (with country code, e.g., +5511999999999)
   * @param text - Message text
   */
  async sendTextMessage(
    phoneNumberId: string,
    accessToken: string,
    to: string,
    text: string,
  ): Promise<{ messageId: string }> {
    try {
      this.logger.log(`📤 Enviando mensagem de texto para ${to}`);

      const response = await this.client.post(
        `/${phoneNumberId}/messages`,
        {
          messaging_product: 'whatsapp',
          recipient_type: 'individual',
          to: to.replace(/\D/g, ''), // Remove non-numeric characters
          type: 'text',
          text: {
            preview_url: true,
            body: text,
          },
        },
        {
          headers: {
            Authorization: `Bearer ${accessToken}`,
          },
        },
      );

      const messageId = response.data.messages[0].id;
      this.logger.log(`✅ Mensagem enviada: ${messageId}`);

      return { messageId };
    } catch (error: unknown) {
      this.logger.error('❌ Erro ao enviar mensagem de texto', {
        error:
          error instanceof Error
            ? error.message
            : typeof error === 'string'
              ? error
              : JSON.stringify(error),
        response: axios.isAxiosError(error) ? error.response?.data : undefined,
      });
      throw error;
    }
  }

  /**
   * Send template message
   * @param phoneNumberId - Business Phone Number ID
   * @param accessToken - Access Token
   * @param to - Recipient phone number
   * @param templateName - Template name
   * @param languageCode - Language code (e.g., 'pt_BR', 'en_US')
   * @param parameters - Template parameters
   */
  async sendTemplateMessage(
    phoneNumberId: string,
    accessToken: string,
    to: string,
    templateName: string,
    languageCode: string,
    parameters?: Array<{ type: string; text: string }>,
  ): Promise<{ messageId: string }> {
    try {
      this.logger.log(
        `📤 Enviando mensagem de template ${templateName} para ${to}`,
      );

      const components = [];
      if (parameters && parameters.length > 0) {
        components.push({
          type: 'body',
          parameters: parameters,
        });
      }

      const response = await this.client.post(
        `/${phoneNumberId}/messages`,
        {
          messaging_product: 'whatsapp',
          recipient_type: 'individual',
          to: to.replace(/\D/g, ''),
          type: 'template',
          template: {
            name: templateName,
            language: {
              code: languageCode,
            },
            components: components.length > 0 ? components : undefined,
          },
        },
        {
          headers: {
            Authorization: `Bearer ${accessToken}`,
          },
        },
      );

      const messageId = response.data.messages[0].id;
      this.logger.log(`✅ Template enviado: ${messageId}`);

      return { messageId };
    } catch (error: unknown) {
      this.logger.error('❌ Erro ao enviar template', {
        error:
          error instanceof Error
            ? error.message
            : typeof error === 'string'
              ? error
              : JSON.stringify(error),
        response: axios.isAxiosError(error) ? error.response?.data : undefined,
      });
      throw error;
    }
  }

  /**
   * Send image message
   * @param phoneNumberId - Business Phone Number ID
   * @param accessToken - Access Token
   * @param to - Recipient phone number
   * @param imageUrl - Image URL (must be publicly accessible)
   * @param caption - Optional caption
   */
  async sendImageMessage(
    phoneNumberId: string,
    accessToken: string,
    to: string,
    imageUrl: string,
    caption?: string,
  ): Promise<{ messageId: string }> {
    try {
      this.logger.log(`🖼️ Enviando imagem para ${to}`);

      const response = await this.client.post(
        `/${phoneNumberId}/messages`,
        {
          messaging_product: 'whatsapp',
          recipient_type: 'individual',
          to: to.replace(/\D/g, ''),
          type: 'image',
          image: {
            link: imageUrl,
            caption: caption,
          },
        },
        {
          headers: {
            Authorization: `Bearer ${accessToken}`,
          },
        },
      );

      const messageId = response.data.messages[0].id;
      this.logger.log(`✅ Imagem enviada: ${messageId}`);

      return { messageId };
    } catch (error: unknown) {
      this.logger.error('❌ Erro ao enviar imagem', {
        error:
          error instanceof Error
            ? error.message
            : typeof error === 'string'
              ? error
              : JSON.stringify(error),
        response: axios.isAxiosError(error) ? error.response?.data : undefined,
      });
      throw error;
    }
  }

  /**
   * Send document message
   * @param phoneNumberId - Business Phone Number ID
   * @param accessToken - Access Token
   * @param to - Recipient phone number
   * @param documentUrl - Document URL (must be publicly accessible)
   * @param filename - File name
   * @param caption - Optional caption
   */
  async sendDocumentMessage(
    phoneNumberId: string,
    accessToken: string,
    to: string,
    documentUrl: string,
    filename: string,
    caption?: string,
  ): Promise<{ messageId: string }> {
    try {
      this.logger.log(`📄 Enviando documento para ${to}`);

      const response = await this.client.post(
        `/${phoneNumberId}/messages`,
        {
          messaging_product: 'whatsapp',
          recipient_type: 'individual',
          to: to.replace(/\D/g, ''),
          type: 'document',
          document: {
            link: documentUrl,
            filename: filename,
            caption: caption,
          },
        },
        {
          headers: {
            Authorization: `Bearer ${accessToken}`,
          },
        },
      );

      const messageId = response.data.messages[0].id;
      this.logger.log(`✅ Documento enviado: ${messageId}`);

      return { messageId };
    } catch (error: unknown) {
      this.logger.error('❌ Erro ao enviar documento', {
        error:
          error instanceof Error
            ? error.message
            : typeof error === 'string'
              ? error
              : JSON.stringify(error),
        response: axios.isAxiosError(error) ? error.response?.data : undefined,
      });
      throw error;
    }
  }

  /**
   * Get phone number info
   * @param phoneNumberId - Business Phone Number ID
   * @param accessToken - Access Token
   */
  async getPhoneNumberInfo(
    phoneNumberId: string,
    accessToken: string,
  ): Promise<{
    verified_name: string;
    display_phone_number: string;
    quality_rating: string;
  }> {
    try {
      this.logger.log(`🔍 Buscando informações do número ${phoneNumberId}`);

      const response = await this.client.get(`/${phoneNumberId}`, {
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
        params: {
          fields: 'verified_name,display_phone_number,quality_rating',
        },
      });

      this.logger.log('✅ Informações obtidas');

      return {
        verified_name: response.data.verified_name,
        display_phone_number: response.data.display_phone_number,
        quality_rating: response.data.quality_rating,
      };
    } catch (error: unknown) {
      this.logger.error('❌ Erro ao buscar informações do número', {
        error:
          error instanceof Error
            ? error.message
            : typeof error === 'string'
              ? error
              : JSON.stringify(error),
        response: axios.isAxiosError(error) ? error.response?.data : undefined,
      });
      throw error;
    }
  }

  /**
   * Mark message as read
   * @param phoneNumberId - Business Phone Number ID
   * @param accessToken - Access Token
   * @param messageId - Message ID to mark as read
   */
  async markMessageAsRead(
    phoneNumberId: string,
    accessToken: string,
    messageId: string,
  ): Promise<{ success: boolean }> {
    try {
      this.logger.log(`✅ Marcando mensagem ${messageId} como lida`);

      await this.client.post(
        `/${phoneNumberId}/messages`,
        {
          messaging_product: 'whatsapp',
          status: 'read',
          message_id: messageId,
        },
        {
          headers: {
            Authorization: `Bearer ${accessToken}`,
          },
        },
      );

      this.logger.log('✅ Mensagem marcada como lida');

      return { success: true };
    } catch (error: unknown) {
      this.logger.error('❌ Erro ao marcar mensagem como lida', {
        error:
          error instanceof Error
            ? error.message
            : typeof error === 'string'
              ? error
              : JSON.stringify(error),
        response: axios.isAxiosError(error) ? error.response?.data : undefined,
      });
      throw error;
    }
  }

  /**
   * Validate webhook signature
   * @param payload - Webhook payload
   * @param signature - X-Hub-Signature-256 header
   * @param appSecret - App Secret from Facebook App
   */
  validateWebhookSignature(
    payload: string,
    signature: string,
    appSecret: string,
  ): boolean {
    const expectedSignature = crypto
      .createHmac('sha256', appSecret)
      .update(payload)
      .digest('hex');

    const signatureHash = signature.split('sha256=')[1];

    return crypto.timingSafeEqual(
      Buffer.from(expectedSignature),
      Buffer.from(signatureHash),
    );
  }
}
