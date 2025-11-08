/**
 * WAHA Webhook Event DTOs
 *
 * Define os tipos de eventos recebidos via webhook do WAHA.
 * Baseado na documentação WAHA: https://waha.devlike.pro/docs/how-to/webhooks/
 */

export interface WahaWebhookEvent {
  event: string;
  session: string;
  me?: {
    id: string;
    pushName?: string;
  };
  payload: unknown;
  engine?: string;
}

/**
 * Message Sent Event
 * Evento: message.sent
 * Quando uma mensagem é enviada com sucesso
 */
export interface MessageSentPayload {
  id: string;
  timestamp: number;
  from: string;
  to: string;
  body?: string;
  hasMedia: boolean;
  ack?: number; // 0=ERROR, 1=PENDING, 2=SERVER_ACK, 3=DELIVERY_ACK, 4=READ, 5=PLAYED
  _data?: {
    id: {
      fromMe: boolean;
      remote: string;
      id: string;
      _serialized: string;
    };
  };
}

/**
 * Message ACK Event
 * Evento: message.ack
 * Quando uma mensagem recebe confirmação (enviada, entregue, lida)
 */
export interface MessageAckPayload {
  id: string;
  from: string;
  to: string;
  ack: number; // 0=ERROR, 1=PENDING, 2=SERVER_ACK, 3=DELIVERY_ACK, 4=READ, 5=PLAYED
  timestamp: number;
  _data?: {
    id: {
      fromMe: boolean;
      remote: string;
      id: string;
      _serialized: string;
    };
  };
}

/**
 * Message Received Event
 * Evento: message.any
 * Quando qualquer mensagem é recebida (incluindo enviadas)
 */
export interface MessageAnyPayload {
  id: string;
  timestamp: number;
  from: string;
  to: string;
  fromMe: boolean;
  body?: string;
  hasMedia: boolean;
  ack?: number;
  _data?: {
    id: {
      fromMe: boolean;
      remote: string;
      id: string;
      _serialized: string;
    };
  };
}

/**
 * Session Status Event
 * Evento: session.status
 * Quando o status da sessão muda (conectada, desconectada, etc)
 */
export interface SessionStatusPayload {
  status: 'STOPPED' | 'STARTING' | 'SCAN_QR_CODE' | 'WORKING' | 'FAILED';
  me?: {
    id: string;
    pushName?: string;
  };
}

/**
 * Message ACK Status
 * Códigos de confirmação do WhatsApp
 */
export enum MessageAckStatus {
  ERROR = 0,
  PENDING = 1,
  SERVER_ACK = 2, // Enviada ao servidor
  DELIVERY_ACK = 3, // Entregue ao destinatário
  READ = 4, // Lida pelo destinatário
  PLAYED = 5, // Reproduzida (áudio/vídeo)
}

/**
 * Helper to get human-readable ACK status
 */
export function getAckStatusText(ack: number): string {
  const statusMap: Record<number, string> = {
    0: 'Erro',
    1: 'Pendente',
    2: 'Enviada',
    3: 'Entregue',
    4: 'Lida',
    5: 'Reproduzida',
  };
  return statusMap[ack] || 'Desconhecido';
}
