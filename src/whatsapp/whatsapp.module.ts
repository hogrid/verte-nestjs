import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ConfigModule } from '@nestjs/config';
import { WhatsappController } from './whatsapp.controller';
import { WhatsappService } from './whatsapp.service';
import { WahaService } from './waha.service';
import { Number } from '../database/entities/number.entity';

/**
 * WhatsappModule
 *
 * Módulo de integração WhatsApp via WAHA API
 * Total: 15 endpoints implementados
 *
 * Endpoints:
 * - GET /api/v1/connect-whatsapp - Iniciar conexão
 * - GET /api/v1/connect-whatsapp-check - Verificar conexão
 * - POST /api/v1/force-check-whatsapp-connections - Forçar verificação
 * - POST /api/v1/waha/qr - Gerar QR Code
 * - GET /api/v1/waha/sessions/:sessionName - Status sessão
 * - POST /api/v1/waha/disconnect - Desconectar (autenticado)
 * - POST /api/v1/disconnect-waha-session - Desconectar (público)
 * - POST /api/v1/webhook-whatsapp - Webhook eventos
 * - POST /api/v1/webhook-whatsapp-extractor - Webhook extrator
 * - POST /api/v1/whatsapp/:instance/poll - Enviar enquete
 * - GET /api/v1/whatsapp/:instance/settings - Obter configurações
 * - POST /api/v1/whatsapp/:instance/settings - Atualizar configurações
 * - GET /api/v1/numbers - Listar números
 * - GET /api/v1/numbers/:number - Mostrar número
 * - DELETE /api/v1/numbers/:number - Remover número
 */
@Module({
  imports: [
    ConfigModule, // Para acessar variáveis de ambiente (WAHA_URL, etc)
    TypeOrmModule.forFeature([Number]),
  ],
  controllers: [WhatsappController],
  providers: [WhatsappService, WahaService],
  exports: [WhatsappService, WahaService], // Export para uso em outros módulos
})
export class WhatsappModule {}
