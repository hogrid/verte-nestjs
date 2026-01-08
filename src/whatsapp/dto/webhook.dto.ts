export interface WhatsAppWebhookPayload {
  event: string;
  instance: string;
  data: {
    key?: {
      remoteJid?: string;
      fromMe?: boolean;
      id?: string;
    };
    pushName?: string;
    message?: {
      conversation?: string;
      extendedTextMessage?: {
        text?: string;
      };
      imageMessage?: {
        url?: string;
        mimetype?: string;
        caption?: string;
      };
      videoMessage?: {
        url?: string;
        mimetype?: string;
        caption?: string;
      };
      audioMessage?: {
        url?: string;
        mimetype?: string;
      };
      documentMessage?: {
        url?: string;
        mimetype?: string;
        fileName?: string;
      };
    };
    messageType?: string;
    messageTimestamp?: number;
    owner?: string;
    source?: string;
    status?: string;
    qrcode?: {
      base64?: string;
      code?: string;
    };
    pairingCode?: string;
    state?: string;
    [key: string]: unknown;
  };
  destination?: string;
  date_time?: string;
  sender?: string;
  server_url?: string;
  apikey?: string;
}

export interface WebhookQRCodeData {
  base64: string;
  code?: string;
  pairingCode?: string;
}

export interface WebhookConnectionData {
  state: 'open' | 'close' | 'connecting';
  statusReason?: number;
  instance?: string;
}

export interface WebhookMessageData {
  key: {
    remoteJid: string;
    fromMe: boolean;
    id: string;
  };
  pushName?: string;
  message: Record<string, unknown>;
  messageType: string;
  messageTimestamp: number;
}
