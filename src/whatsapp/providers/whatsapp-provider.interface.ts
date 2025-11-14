/**
 * WhatsAppProvider Interface
 *
 * Interface abstrata para providers de WhatsApp.
 * Permite trocar facilmente entre diferentes implementações:
 * - Evolution API
 * - WAHA
 * - WhatsApp Cloud API
 * - Outros providers futuros
 *
 * Benefícios:
 * - ✅ Desacoplamento total do provider específico
 * - ✅ Fácil trocar de provider sem alterar lógica de negócio
 * - ✅ Testes unitários facilitados (mock providers)
 * - ✅ Suporte a múltiplos providers simultaneamente
 */

/**
 * Informações de uma instância WhatsApp
 */
export interface WhatsAppInstanceInfo {
  instanceName: string;
  status: 'connected' | 'disconnected' | 'connecting' | 'qr';
  phoneNumber?: string;
  profileName?: string;
  qrCode?: string;
}

/**
 * Configuração para criar instância
 */
export interface CreateInstanceOptions {
  instanceName: string;
  qrcode?: boolean;
  webhookUrl?: string;
  webhookEvents?: string[];
  integration?: string; // 'WHATSAPP-BAILEYS', 'WHATSAPP-BUSINESS', etc
}

/**
 * Resultado de envio de mensagem
 */
export interface SendMessageResult {
  success: boolean;
  messageId: string;
  timestamp?: number;
}

/**
 * Opções para envio de texto
 */
export interface SendTextOptions {
  to: string;
  text: string;
}

/**
 * Opções para envio de mídia
 */
export interface SendMediaOptions {
  to: string;
  mediaUrl: string;
  mediaType: 'image' | 'video' | 'audio' | 'document';
  caption?: string;
  fileName?: string;
}

/**
 * Opções para envio de template
 */
export interface SendTemplateOptions {
  to: string;
  templateName: string;
  languageCode?: string;
  parameters?: any[];
}

/**
 * Interface principal do WhatsApp Provider
 */
export interface IWhatsAppProvider {
  /**
   * Nome do provider (ex: 'evolution-api', 'waha', 'cloud-api')
   */
  readonly providerName: string;

  /**
   * Versão do provider
   */
  readonly providerVersion: string;

  // ==================== Instance Management ====================

  /**
   * Criar nova instância WhatsApp
   * @param options Opções de configuração
   * @returns Informações da instância criada
   */
  createInstance(
    options: CreateInstanceOptions,
  ): Promise<WhatsAppInstanceInfo>;

  /**
   * Obter status da instância
   * @param instanceName Nome da instância
   * @returns Status e informações da instância
   */
  getInstanceStatus(instanceName: string): Promise<WhatsAppInstanceInfo>;

  /**
   * Deletar instância
   * @param instanceName Nome da instância
   * @returns Sucesso da operação
   */
  deleteInstance(instanceName: string): Promise<{ success: boolean }>;

  /**
   * Reconectar instância desconectada
   * @param instanceName Nome da instância
   * @returns Informações após reconexão
   */
  reconnectInstance(instanceName: string): Promise<WhatsAppInstanceInfo>;

  // ==================== QR Code ====================

  /**
   * Obter QR Code para conectar
   * @param instanceName Nome da instância
   * @returns QR Code em base64
   */
  getQRCode(instanceName: string): Promise<{ qr: string }>;

  // ==================== Messaging ====================

  /**
   * Enviar mensagem de texto
   * @param instanceName Nome da instância
   * @param options Opções de envio
   * @returns Resultado do envio
   */
  sendText(
    instanceName: string,
    options: SendTextOptions,
  ): Promise<SendMessageResult>;

  /**
   * Enviar mídia (imagem, vídeo, áudio, documento)
   * @param instanceName Nome da instância
   * @param options Opções de envio
   * @returns Resultado do envio
   */
  sendMedia(
    instanceName: string,
    options: SendMediaOptions,
  ): Promise<SendMessageResult>;

  /**
   * Enviar template (opcional - nem todos providers suportam)
   * @param instanceName Nome da instância
   * @param options Opções de envio
   * @returns Resultado do envio
   */
  sendTemplate?(
    instanceName: string,
    options: SendTemplateOptions,
  ): Promise<SendMessageResult>;

  // ==================== Webhooks ====================

  /**
   * Validar webhook recebido (opcional)
   * @param payload Payload do webhook
   * @param signature Assinatura do webhook (se aplicável)
   * @returns Se webhook é válido
   */
  validateWebhook?(payload: any, signature?: string): boolean;

  /**
   * Processar webhook recebido
   * @param payload Payload do webhook
   * @returns Dados processados do webhook
   */
  processWebhook?(payload: any): Promise<{
    type: 'message' | 'status' | 'connection' | 'other';
    data: any;
  }>;

  // ==================== Health Check ====================

  /**
   * Verificar se provider está funcionando
   * @returns Status de saúde do provider
   */
  healthCheck(): Promise<{
    healthy: boolean;
    message?: string;
  }>;
}

/**
 * Token para injeção de dependência no NestJS
 */
export const WHATSAPP_PROVIDER = 'WHATSAPP_PROVIDER';
