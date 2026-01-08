import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import axios, { AxiosInstance } from 'axios';

/**
 * WahaService
 *
 * ⚠️ **DEPRECATED**: Este service não é mais utilizado no projeto.
 * O sistema migrou para Evolution API com arquitetura desacoplada.
 *
 * **Use ao invés**: `IWhatsAppProvider` interface + `EvolutionApiProvider`
 *
 * ---
 *
 * Service para integração com a WAHA API (WhatsApp HTTP API)
 * Encapsula todas as chamadas HTTP para a API WAHA
 *
 * Documentação WAHA: https://waha.devlike.pro
 *
 * **Histórico de migração**:
 * - WAHA → WhatsApp Cloud API → Evolution API (atual)
 *
 * @deprecated Mantido apenas para referência histórica
 */
@Injectable()
export class WahaService {
  private readonly logger = new Logger(WahaService.name);
  private readonly wahaClient: AxiosInstance;
  private readonly wahaUrl: string;
  private readonly globalApiKey: string;

  constructor(private readonly configService: ConfigService) {
    this.wahaUrl = this.configService.get<string>(
      'WAHA_URL',
      'http://localhost:3000',
    );
    this.globalApiKey = this.configService.get<string>(
      'API_WHATSAPP_GLOBALKEY',
      '',
    );

    // Create axios instance with base config
    this.wahaClient = axios.create({
      baseURL: this.wahaUrl,
      timeout: 30000, // 30 seconds
      headers: {
        'Content-Type': 'application/json',
        'X-Api-Key': this.globalApiKey,
      },
    });

    this.logger.log(`WahaService inicializado: ${this.wahaUrl}`);
  }

  /**
   * Get QR Code for session
   * GET /api/{session}/auth/qr (sem "sessions")
   */
  async getQrCode(session: string): Promise<{ qr: string }> {
    try {
      this.logger.log(`🔍 Buscando QR Code para sessão: ${session}`);

      // GET (não POST) para pegar o QR Code
      const response = await this.wahaClient.get(`/api/${session}/auth/qr`, {
        responseType: 'arraybuffer', // Receber como binary
      });

      // Converter para base64
      const base64 = Buffer.from(response.data, 'binary').toString('base64');
      const qrDataUrl = `data:image/png;base64,${base64}`;

      return {
        qr: qrDataUrl,
      };
    } catch (error: unknown) {
      this.logger.error(`❌ Erro ao buscar QR Code: ${session}`, {
        error: error instanceof Error ? error.message : String(error),
      });
      throw error;
    }
  }

  /**
   * Get session status
   * GET /api/sessions/{session}
   */
  async getSessionStatus(session: string): Promise<{
    name: string;
    status: string;
    me?: {
      id: string;
      pushName: string;
    };
  }> {
    try {
      this.logger.log(`🔍 Verificando status da sessão: ${session}`);

      const response = await this.wahaClient.get(`/api/sessions/${session}`);

      return response.data;
    } catch (error: unknown) {
      this.logger.error(`❌ Erro ao verificar status da sessão: ${session}`, {
        error: error instanceof Error ? error.message : String(error),
      });
      throw error;
    }
  }

  /**
   * Start session
   * POST /api/sessions/{session}/start
   */
  async startSession(session: string): Promise<boolean> {
    try {
      this.logger.log(`▶️ Iniciando sessão: ${session}`);

      await this.wahaClient.post(`/api/sessions/${session}/start`, {
        name: session,
      });

      return true;
    } catch (error: unknown) {
      this.logger.error(`❌ Erro ao iniciar sessão: ${session}`, {
        error: error instanceof Error ? error.message : String(error),
      });
      throw error;
    }
  }

  /**
   * Stop session
   * POST /api/{session}/stop
   */
  async stopSession(session: string): Promise<boolean> {
    try {
      this.logger.log(`⏹️ Parando sessão: ${session}`);

      await this.wahaClient.post(`/api/${session}/stop`, {});

      return true;
    } catch (error: unknown) {
      this.logger.error(`❌ Erro ao parar sessão: ${session}`, {
        error: error instanceof Error ? error.message : String(error),
      });
      throw error;
    }
  }

  /**
   * Logout session
   * POST /api/{session}/auth/logout
   */
  async logoutSession(session: string): Promise<boolean> {
    try {
      this.logger.log(`🚪 Desconectando sessão: ${session}`);

      await this.wahaClient.post(`/api/${session}/auth/logout`, {});

      return true;
    } catch (error: unknown) {
      this.logger.error(`❌ Erro ao desconectar sessão: ${session}`, {
        error: error instanceof Error ? error.message : String(error),
      });
      throw error;
    }
  }

  /**
   * Send text message
   * POST /api/{session}/sendText
   */
  async sendText(
    session: string,
    chatId: string,
    text: string,
  ): Promise<{ id: string }> {
    try {
      this.logger.log(`📤 Enviando mensagem de texto: ${session}`);

      const response = await this.wahaClient.post(`/api/${session}/sendText`, {
        chatId,
        text,
      });

      return response.data;
    } catch (error: unknown) {
      this.logger.error(`❌ Erro ao enviar mensagem de texto`, {
        error: error instanceof Error ? error.message : String(error),
      });
      throw error;
    }
  }

  /**
   * Send poll
   * POST /api/{session}/sendPoll
   */
  async sendPoll(
    session: string,
    chatId: string,
    poll: {
      name: string;
      options: string[];
      selectableCount: number;
    },
  ): Promise<{ id: string }> {
    try {
      this.logger.log(`📊 Enviando enquete: ${session}`);

      const response = await this.wahaClient.post(`/api/${session}/sendPoll`, {
        chatId,
        poll,
      });

      return response.data;
    } catch (error: unknown) {
      this.logger.error(`❌ Erro ao enviar enquete`, {
        error: error instanceof Error ? error.message : String(error),
      });
      throw error;
    }
  }

  /**
   * Get session settings
   * GET /api/{session}/settings
   */
  async getSettings(session: string): Promise<Record<string, unknown>> {
    try {
      this.logger.log(`⚙️ Buscando configurações da sessão: ${session}`);

      const response = await this.wahaClient.get(`/api/${session}/settings`);

      return response.data;
    } catch (error: unknown) {
      this.logger.error(`❌ Erro ao buscar configurações`, {
        error: error instanceof Error ? error.message : String(error),
      });
      throw error;
    }
  }

  /**
   * Update session settings
   * POST /api/{session}/settings
   */
  async updateSettings(
    session: string,
    settings: Record<string, unknown>,
  ): Promise<Record<string, unknown>> {
    try {
      this.logger.log(`⚙️ Atualizando configurações da sessão: ${session}`);

      const response = await this.wahaClient.post(
        `/api/${session}/settings`,
        settings,
      );

      return response.data;
    } catch (error: unknown) {
      this.logger.error(`❌ Erro ao atualizar configurações`, {
        error: error instanceof Error ? error.message : String(error),
      });
      throw error;
    }
  }

  /**
   * Send image
   * POST /api/{session}/sendImage
   */
  async sendImage(
    session: string,
    chatId: string,
    imageUrl: string,
    caption?: string,
  ): Promise<{ id: string }> {
    try {
      this.logger.log(`🖼️ Enviando imagem: ${session}`);

      const response = await this.wahaClient.post(`/api/${session}/sendImage`, {
        chatId,
        file: { url: imageUrl },
        caption,
      });

      return response.data;
    } catch (error: unknown) {
      this.logger.error(`❌ Erro ao enviar imagem`, {
        error: error instanceof Error ? error.message : String(error),
      });
      throw error;
    }
  }

  /**
   * Send audio
   * POST /api/{session}/sendAudio
   */
  async sendAudio(
    session: string,
    chatId: string,
    audioUrl: string,
  ): Promise<{ id: string }> {
    try {
      this.logger.log(`🎵 Enviando áudio: ${session}`);

      const response = await this.wahaClient.post(`/api/${session}/sendAudio`, {
        chatId,
        file: { url: audioUrl },
      });

      return response.data;
    } catch (error: unknown) {
      this.logger.error(`❌ Erro ao enviar áudio`, {
        error: error instanceof Error ? error.message : String(error),
      });
      throw error;
    }
  }

  /**
   * Send video
   * POST /api/{session}/sendVideo
   */
  async sendVideo(
    session: string,
    chatId: string,
    videoUrl: string,
    caption?: string,
  ): Promise<{ id: string }> {
    try {
      this.logger.log(`🎬 Enviando vídeo: ${session}`);

      const response = await this.wahaClient.post(`/api/${session}/sendVideo`, {
        chatId,
        file: { url: videoUrl },
        caption,
      });

      return response.data;
    } catch (error: unknown) {
      this.logger.error(`❌ Erro ao enviar vídeo`, {
        error: error instanceof Error ? error.message : String(error),
      });
      throw error;
    }
  }

  /**
   * Check if phone number exists on WhatsApp
   * GET /api/{session}/contacts/check-exists
   */
  async checkPhoneExists(
    session: string,
    phone: string,
  ): Promise<{ numberExists: boolean }> {
    try {
      this.logger.log(`🔍 Verificando se número existe: ${phone}`);

      const response = await this.wahaClient.get(
        `/api/${session}/contacts/check-exists`,
        {
          params: { phone },
        },
      );

      return response.data;
    } catch (error: unknown) {
      this.logger.error(`❌ Erro ao verificar número`, {
        error: error instanceof Error ? error.message : String(error),
      });
      throw error;
    }
  }
}
