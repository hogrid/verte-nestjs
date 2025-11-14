import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsOptional, IsString } from 'class-validator';

/**
 * DTO para configurar WhatsApp via Evolution API
 *
 * Evolution API permite múltiplas instâncias com QR Code
 * Cada usuário pode conectar seu próprio número WhatsApp
 *
 * Docs: https://doc.evolution-api.com/v2
 */
export class SetupWhatsAppDto {
  @ApiProperty({
    description: 'Nome da instância (identificador único)',
    example: 'user_123_whatsapp',
  })
  @IsNotEmpty({ message: 'Nome da instância é obrigatório' })
  @IsString({ message: 'Nome da instância deve ser uma string' })
  instanceName: string;

  @ApiProperty({
    description: 'Nome para identificar esta conexão WhatsApp',
    example: 'Meu WhatsApp Principal',
    required: false,
  })
  @IsOptional()
  @IsString({ message: 'Nome deve ser uma string' })
  name?: string;

  @ApiProperty({
    description: 'URL do webhook para receber eventos (opcional)',
    example: 'https://meu-dominio.com/api/v1/whatsapp/webhook',
    required: false,
  })
  @IsOptional()
  @IsString({ message: 'URL do webhook deve ser uma string' })
  webhookUrl?: string;
}
