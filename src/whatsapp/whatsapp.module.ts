import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ConfigModule } from '@nestjs/config';
import { WhatsappController } from './whatsapp.controller';
import { WhatsappService } from './whatsapp.service';
import { WhatsAppCloudService } from './whatsapp-cloud.service';
import { Number } from '../database/entities/number.entity';
import { MessageByContact } from '../database/entities/message-by-contact.entity';
import { PublicByContact } from '../database/entities/public-by-contact.entity';

/**
 * WhatsappModule
 *
 * Módulo de integração WhatsApp via WhatsApp Cloud API (Meta/Facebook)
 * Total: 10 endpoints implementados
 *
 * **MUDANÇA IMPORTANTE**: Migrado de WAHA para WhatsApp Cloud API oficial
 *
 * Endpoints:
 * - POST /api/v1/whatsapp/setup - Configurar WhatsApp (Phone Number ID + Access Token)
 * - GET /api/v1/whatsapp/status - Verificar status de conexão
 * - POST /api/v1/whatsapp/send-text - Enviar mensagem de texto
 * - POST /api/v1/whatsapp/send-template - Enviar template
 * - POST /api/v1/whatsapp/send-image - Enviar imagem
 * - GET /api/v1/numbers - Listar números
 * - GET /api/v1/numbers/:number - Mostrar número
 * - DELETE /api/v1/numbers/:number - Remover número
 * - GET /api/v1/whatsapp/webhook - Verificação de webhook
 * - POST /api/v1/whatsapp/webhook - Receber eventos WhatsApp
 */
@Module({
  imports: [
    ConfigModule, // Para acessar variáveis de ambiente
    TypeOrmModule.forFeature([Number, MessageByContact, PublicByContact]),
  ],
  controllers: [WhatsappController],
  providers: [WhatsappService, WhatsAppCloudService],
  exports: [WhatsappService, WhatsAppCloudService], // Export para uso em outros módulos
})
export class WhatsappModule {}
