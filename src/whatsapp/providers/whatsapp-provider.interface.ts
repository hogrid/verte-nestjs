export const WHATSAPP_PROVIDER = 'WHATSAPP_PROVIDER';

export interface CreateInstanceOptions {
  instanceName?: string;
  qrcode?: boolean;
  webhookUrl?: string;
}

export interface InstanceInfo {
  instanceName: string;
  status: 'connected' | 'disconnected' | 'connecting' | 'qr' | 'unknown';
  qrCode?: string;
  pairingCode?: string;
  phoneNumber?: string;
  profileName?: string;
  profilePicture?: string;
}

export interface InstanceStatus {
  instanceName: string;
  state: 'open' | 'close' | 'connecting' | 'unknown';
  status: 'connected' | 'disconnected' | 'connecting' | 'qr' | 'unknown';
  connected: boolean;
  phoneNumber?: string;
  profileName?: string;
  profilePicture?: string;
}

export interface QrCodeResponse {
  qrcode?: string;
  base64?: string;
  code?: string;
  pairingCode?: string;
}

export interface SendTextOptions {
  to: string;
  text: string;
}

export interface SendMediaOptions {
  to: string;
  mediaUrl: string;
  mediaType: 'image' | 'video' | 'audio' | 'document';
  caption?: string;
  fileName?: string;
}

export interface SendTemplateOptions {
  to: string;
  templateName: string;
  languageCode?: string;
  parameters?: string[];
}

export interface SendMessageResponse {
  messageId?: string;
  status: 'sent' | 'queued' | 'failed';
  error?: string;
}

export interface WebhookPayload {
  event: string;
  instance: string;
  data: Record<string, unknown>;
}

export interface ProcessedWebhook {
  type: 'qrcode' | 'connection' | 'contacts' | 'message' | 'other';
  data: Record<string, unknown>;
}

export interface IWhatsAppProvider {
  readonly providerName: string;
  readonly providerVersion: string;

  // Instance Management
  createInstance(options: CreateInstanceOptions): Promise<InstanceInfo>;
  deleteInstance(instanceName: string): Promise<void>;
  connectInstance(instanceName: string): Promise<QrCodeResponse>;
  disconnectInstance(instanceName: string): Promise<void>;
  restartInstance(instanceName: string): Promise<void>;
  reconnectInstance(instanceName: string): Promise<QrCodeResponse>;
  getInstanceStatus(instanceName: string): Promise<InstanceStatus>;
  getAllInstances(): Promise<InstanceStatus[]>;

  // QR Code
  getQrCode(instanceName: string): Promise<QrCodeResponse>;

  // Messaging
  sendText(instanceName: string, options: SendTextOptions): Promise<SendMessageResponse>;
  sendMedia(instanceName: string, options: SendMediaOptions): Promise<SendMessageResponse>;
  sendTemplate?(instanceName: string, options: SendTemplateOptions): Promise<SendMessageResponse>;

  // Legacy methods for compatibility
  sendTextMessage(instanceName: string, phone: string, message: string): Promise<SendMessageResponse>;
  sendImageMessage(instanceName: string, phone: string, imageUrl: string, caption?: string): Promise<SendMessageResponse>;
  sendVideoMessage(instanceName: string, phone: string, videoUrl: string, caption?: string): Promise<SendMessageResponse>;
  sendAudioMessage(instanceName: string, phone: string, audioUrl: string): Promise<SendMessageResponse>;
  sendDocumentMessage(instanceName: string, phone: string, documentUrl: string, fileName?: string): Promise<SendMessageResponse>;
  sendMediaMessage(
    instanceName: string,
    phone: string,
    mediaUrl: string,
    mediaType: 'image' | 'video' | 'audio' | 'document',
    caption?: string,
    fileName?: string,
  ): Promise<SendMessageResponse>;

  // Profile
  getProfilePicture(instanceName: string, phone: string): Promise<string | null>;
  getProfileStatus(instanceName: string, phone: string): Promise<string | null>;
  setProfilePicture(instanceName: string, imageUrl: string): Promise<void>;
  setProfileStatus(instanceName: string, status: string): Promise<void>;

  // Contacts
  getContacts(instanceName: string): Promise<Array<{ phone: string; name?: string; profilePicture?: string }>>;
  checkNumberExists(instanceName: string, phone: string): Promise<boolean>;

  // Webhook
  setWebhook(instanceName: string, webhookUrl: string): Promise<void>;
  processWebhook?(payload: WebhookPayload): Promise<ProcessedWebhook>;
}
