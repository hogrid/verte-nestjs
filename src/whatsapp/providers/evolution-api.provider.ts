import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import {
  IWhatsAppProvider,
  CreateInstanceOptions,
  InstanceInfo,
  InstanceStatus,
  QrCodeResponse,
  SendTextOptions,
  SendMediaOptions,
  SendTemplateOptions,
  SendMessageResponse,
  WebhookPayload,
  ProcessedWebhook,
} from './whatsapp-provider.interface';

@Injectable()
export class EvolutionApiProvider implements IWhatsAppProvider {
  private readonly logger = new Logger(EvolutionApiProvider.name);
  private readonly baseUrl: string;
  private readonly apiKey: string;

  readonly providerName = 'evolution-api';
  readonly providerVersion = '2.0.0';

  constructor(private readonly configService: ConfigService) {
    this.baseUrl = this.configService.get<string>('EVOLUTION_API_URL') || 'http://localhost:8080';
    this.apiKey = this.configService.get<string>('EVOLUTION_API_KEY') || '';
  }

  private async request<T>(method: string, endpoint: string, body?: unknown): Promise<T> {
    const url = `${this.baseUrl}${endpoint}`;
    const options: RequestInit = {
      method,
      headers: {
        'Content-Type': 'application/json',
        'apikey': this.apiKey,
      },
    };

    if (body) {
      options.body = JSON.stringify(body);
    }

    try {
      const response = await fetch(url, options);
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || `Request failed with status ${response.status}`);
      }

      return data as T;
    } catch (error) {
      this.logger.error(`Evolution API request failed: ${endpoint}`, error);
      throw error;
    }
  }

  async createInstance(options: CreateInstanceOptions): Promise<InstanceInfo> {
    const instanceName = options.instanceName || `instance_${Date.now()}`;

    try {
      const response = await this.request<{ instance: { instanceName: string; status: string }; qrcode?: { base64?: string; pairingCode?: string } }>(
        'POST',
        '/instance/create',
        {
          instanceName,
          qrcode: options.qrcode ?? true,
          integration: 'WHATSAPP-BAILEYS',
        }
      );

      return {
        instanceName: response.instance?.instanceName || instanceName,
        status: response.instance?.status === 'open' ? 'connected' : 'disconnected',
        qrCode: response.qrcode?.base64,
        pairingCode: response.qrcode?.pairingCode,
      };
    } catch (error) {
      // Instance may already exist, try to get its status
      this.logger.warn(`Create instance failed, checking if exists: ${instanceName}`);
      const status = await this.getInstanceStatus(instanceName);
      return {
        instanceName,
        status: status.status,
        qrCode: undefined,
      };
    }
  }

  async deleteInstance(instanceName: string): Promise<void> {
    await this.request('DELETE', `/instance/delete/${instanceName}`);
  }

  async connectInstance(instanceName: string): Promise<QrCodeResponse> {
    const response = await this.request<{ base64?: string; code?: string; pairingCode?: string }>(
      'GET',
      `/instance/connect/${instanceName}`
    );

    return {
      qrcode: response.base64,
      base64: response.base64,
      code: response.code,
      pairingCode: response.pairingCode,
    };
  }

  async disconnectInstance(instanceName: string): Promise<void> {
    await this.request('DELETE', `/instance/logout/${instanceName}`);
  }

  async restartInstance(instanceName: string): Promise<void> {
    await this.request('PUT', `/instance/restart/${instanceName}`);
  }

  async reconnectInstance(instanceName: string): Promise<QrCodeResponse> {
    // First logout, then connect again
    try {
      await this.disconnectInstance(instanceName);
    } catch {
      // Ignore disconnect errors
    }
    return this.connectInstance(instanceName);
  }

  async getInstanceStatus(instanceName: string): Promise<InstanceStatus> {
    try {
      const response = await this.request<{ instance: { state: string; status?: string } }>(
        'GET',
        `/instance/connectionState/${instanceName}`
      );

      const state = response.instance?.state || 'unknown';
      const isConnected = state === 'open';

      return {
        instanceName,
        state: state as 'open' | 'close' | 'connecting' | 'unknown',
        status: isConnected ? 'connected' : 'disconnected',
        connected: isConnected,
      };
    } catch {
      return {
        instanceName,
        state: 'unknown',
        status: 'unknown',
        connected: false,
      };
    }
  }

  async getAllInstances(): Promise<InstanceStatus[]> {
    try {
      const response = await this.request<Array<{ instance: { instanceName: string; state: string } }>>(
        'GET',
        '/instance/fetchInstances'
      );

      return response.map((item) => ({
        instanceName: item.instance?.instanceName || 'unknown',
        state: (item.instance?.state || 'unknown') as 'open' | 'close' | 'connecting' | 'unknown',
        status: item.instance?.state === 'open' ? 'connected' : 'disconnected' as const,
        connected: item.instance?.state === 'open',
      }));
    } catch {
      return [];
    }
  }

  async getQrCode(instanceName: string): Promise<QrCodeResponse> {
    return this.connectInstance(instanceName);
  }

  async sendText(instanceName: string, options: SendTextOptions): Promise<SendMessageResponse> {
    const response = await this.request<{ key?: { id?: string }; status?: string }>(
      'POST',
      `/message/sendText/${instanceName}`,
      {
        number: options.to,
        text: options.text,
      }
    );

    return {
      messageId: response.key?.id,
      status: 'sent',
    };
  }

  async sendMedia(instanceName: string, options: SendMediaOptions): Promise<SendMessageResponse> {
    const endpoint = `/message/sendMedia/${instanceName}`;

    const response = await this.request<{ key?: { id?: string }; status?: string }>(
      'POST',
      endpoint,
      {
        number: options.to,
        mediatype: options.mediaType,
        media: options.mediaUrl,
        caption: options.caption,
        fileName: options.fileName,
      }
    );

    return {
      messageId: response.key?.id,
      status: 'sent',
    };
  }

  async sendTemplate(instanceName: string, options: SendTemplateOptions): Promise<SendMessageResponse> {
    // Evolution API doesn't natively support templates, send as text
    return this.sendText(instanceName, {
      to: options.to,
      text: `Template: ${options.templateName}`,
    });
  }

  // Legacy methods for compatibility
  async sendTextMessage(instanceName: string, phone: string, message: string): Promise<SendMessageResponse> {
    return this.sendText(instanceName, { to: phone, text: message });
  }

  async sendImageMessage(instanceName: string, phone: string, imageUrl: string, caption?: string): Promise<SendMessageResponse> {
    return this.sendMedia(instanceName, { to: phone, mediaUrl: imageUrl, mediaType: 'image', caption });
  }

  async sendVideoMessage(instanceName: string, phone: string, videoUrl: string, caption?: string): Promise<SendMessageResponse> {
    return this.sendMedia(instanceName, { to: phone, mediaUrl: videoUrl, mediaType: 'video', caption });
  }

  async sendAudioMessage(instanceName: string, phone: string, audioUrl: string): Promise<SendMessageResponse> {
    return this.sendMedia(instanceName, { to: phone, mediaUrl: audioUrl, mediaType: 'audio' });
  }

  async sendDocumentMessage(instanceName: string, phone: string, documentUrl: string, fileName?: string): Promise<SendMessageResponse> {
    return this.sendMedia(instanceName, { to: phone, mediaUrl: documentUrl, mediaType: 'document', fileName });
  }

  async sendMediaMessage(
    instanceName: string,
    phone: string,
    mediaUrl: string,
    mediaType: 'image' | 'video' | 'audio' | 'document',
    caption?: string,
    fileName?: string,
  ): Promise<SendMessageResponse> {
    return this.sendMedia(instanceName, { to: phone, mediaUrl, mediaType, caption, fileName });
  }

  async getProfilePicture(instanceName: string, phone: string): Promise<string | null> {
    try {
      const response = await this.request<{ profilePictureUrl?: string }>(
        'POST',
        `/chat/fetchProfilePictureUrl/${instanceName}`,
        { number: phone }
      );
      return response.profilePictureUrl || null;
    } catch {
      return null;
    }
  }

  async getProfileStatus(instanceName: string, phone: string): Promise<string | null> {
    try {
      const response = await this.request<{ status?: string }>(
        'POST',
        `/chat/fetchStatus/${instanceName}`,
        { number: phone }
      );
      return response.status || null;
    } catch {
      return null;
    }
  }

  async setProfilePicture(instanceName: string, imageUrl: string): Promise<void> {
    await this.request('POST', `/instance/setProfilePicture/${instanceName}`, {
      picture: imageUrl,
    });
  }

  async setProfileStatus(instanceName: string, status: string): Promise<void> {
    await this.request('POST', `/instance/setProfileStatus/${instanceName}`, {
      status,
    });
  }

  async getContacts(instanceName: string): Promise<Array<{ phone: string; name?: string; profilePicture?: string }>> {
    try {
      const response = await this.request<Array<{ id: string; pushName?: string; profilePictureUrl?: string }>>(
        'POST',
        `/chat/fetchContacts/${instanceName}`,
        {}
      );

      return response.map((contact) => ({
        phone: contact.id?.replace('@s.whatsapp.net', '') || '',
        name: contact.pushName,
        profilePicture: contact.profilePictureUrl,
      }));
    } catch {
      return [];
    }
  }

  async checkNumberExists(instanceName: string, phone: string): Promise<boolean> {
    try {
      const response = await this.request<{ exists: boolean }>(
        'POST',
        `/chat/whatsappNumbers/${instanceName}`,
        { numbers: [phone] }
      );
      return response.exists ?? false;
    } catch {
      return false;
    }
  }

  async setWebhook(instanceName: string, webhookUrl: string): Promise<void> {
    await this.request('POST', `/webhook/set/${instanceName}`, {
      url: webhookUrl,
      events: [
        'QRCODE_UPDATED',
        'CONNECTION_UPDATE',
        'MESSAGES_SET',
        'MESSAGES_UPSERT',
        'MESSAGES_UPDATE',
        'SEND_MESSAGE',
        'CONTACTS_SET',
        'CONTACTS_UPSERT',
        'CONTACTS_UPDATE',
        'PRESENCE_UPDATE',
        'CHATS_SET',
        'CHATS_UPSERT',
        'CHATS_UPDATE',
        'CHATS_DELETE',
        'GROUPS_UPSERT',
        'GROUP_UPDATE',
        'GROUP_PARTICIPANTS_UPDATE',
        'NEW_JWT_TOKEN',
      ],
    });
  }

  async processWebhook(payload: WebhookPayload): Promise<ProcessedWebhook> {
    const event = payload.event?.toLowerCase() || '';
    const data = payload.data || {};
    const qrcodeData = data.qrcode as { base64?: string } | string | undefined;

    if (event.includes('qrcode')) {
      return {
        type: 'qrcode',
        data: {
          base64: typeof qrcodeData === 'object' ? qrcodeData?.base64 : qrcodeData,
          pairingCode: data.pairingCode,
          instanceName: payload.instance,
        },
      };
    }

    if (event.includes('connection')) {
      return {
        type: 'connection',
        data: {
          state: data.state || data.status,
          instanceName: payload.instance,
        },
      };
    }

    if (event.includes('contacts')) {
      return {
        type: 'contacts',
        data: {
          instanceName: payload.instance,
          contacts: data,
        },
      };
    }

    if (event.includes('message')) {
      return {
        type: 'message',
        data: {
          instanceName: payload.instance,
          ...data,
        },
      };
    }

    return {
      type: 'other',
      data: {
        event,
        instanceName: payload.instance,
        ...data,
      },
    };
  }
}
