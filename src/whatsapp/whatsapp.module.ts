import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ConfigModule } from '@nestjs/config';
import { ContactsModule } from '../contacts/contacts.module';
import { WhatsappController } from './whatsapp.controller';
import { LegacyCompatController } from './waha-compat.controller';
import { WhatsappService } from './whatsapp.service';
import { EvolutionApiProvider } from './providers/evolution-api.provider';
import { WHATSAPP_PROVIDER } from './providers/whatsapp-provider.interface';
import { InstanceManagerService } from './instance-manager.service';
import { Campaign } from '../database/entities/campaign.entity';
import { Number } from '../database/entities/number.entity';
import { MessageByContact } from '../database/entities/message-by-contact.entity';
import { PublicByContact } from '../database/entities/public-by-contact.entity';

/**
 * WhatsappModule
 *
 * Módulo de integração WhatsApp via Evolution API
 * Total: 11 endpoints principais + endpoints de compatibilidade legada
 *
 * **ARQUITETURA DESACOPLADA**:
 * - Usa IWhatsAppProvider interface
 * - Provider atual: Evolution API v2
 * - Provider injetado via Dependency Injection
 *
 * **Para trocar de provider**:
 * Basta alterar o `useClass` no provider WHATSAPP_PROVIDER:
 * ```
 * { provide: WHATSAPP_PROVIDER, useClass: OutroProvider }
 * ```
 *
 * Endpoints principais:
 * - POST /api/v1/whatsapp/setup - Configurar WhatsApp (criar instância + QR Code)
 * - GET /api/v1/whatsapp/qrcode/:number - Obter QR Code atualizado
 * - GET /api/v1/whatsapp/status - Verificar status de conexão
 * - POST /api/v1/whatsapp/send-text - Enviar mensagem de texto
 * - POST /api/v1/whatsapp/send-template - Enviar template
 * - POST /api/v1/whatsapp/send-image - Enviar imagem
 * - GET /api/v1/numbers - Listar números
 * - GET /api/v1/numbers/:number - Mostrar número
 * - DELETE /api/v1/numbers/:number - Remover número
 * - GET /api/v1/whatsapp/webhook - Verificação de webhook
 * - POST /api/v1/whatsapp/webhook - Receber eventos WhatsApp
 *
 * Endpoints de compatibilidade legada (LegacyCompatController):
 * - POST /api/v1/disconnect-waha-session - Desconectar sessão (protegido)
 * - POST /api/v1/waha/disconnect - Desconectar (protegido)
 * - POST /api/v1/waha/qr - Gerar QR Code (legado)
 * - GET /api/v1/waha/sessions/:sessionName - Status da sessão (legado)
 */
@Module({
  imports: [
    ConfigModule,
    ContactsModule,
    TypeOrmModule.forFeature([Number, MessageByContact, PublicByContact, Campaign]),
  ],
  controllers: [WhatsappController, LegacyCompatController],
  providers: [
    WhatsappService,
    InstanceManagerService, // Gerenciador automático de instâncias
    EvolutionApiProvider, // Provider concreto
    {
      provide: WHATSAPP_PROVIDER, // Token para injeção
      useClass: EvolutionApiProvider, // ✅ Para trocar provider, altere aqui
    },
  ],
  exports: [WhatsappService, WHATSAPP_PROVIDER, InstanceManagerService], // Export para uso em outros módulos
})
export class WhatsappModule {}
