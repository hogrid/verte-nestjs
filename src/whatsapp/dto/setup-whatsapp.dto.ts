import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsString } from 'class-validator';

/**
 * DTO para configurar WhatsApp Cloud API
 * Usuário fornece Phone Number ID e Access Token da Meta
 */
export class SetupWhatsAppDto {
  @ApiProperty({
    description: 'Phone Number ID da Meta (obtido no dashboard do WhatsApp Business)',
    example: '106540352242922',
  })
  @IsNotEmpty({ message: 'Phone Number ID é obrigatório' })
  @IsString({ message: 'Phone Number ID deve ser uma string' })
  phone_number_id: string;

  @ApiProperty({
    description: 'Access Token permanente da Meta (System User Token)',
    example: 'EAAJB...',
  })
  @IsNotEmpty({ message: 'Access Token é obrigatório' })
  @IsString({ message: 'Access Token deve ser uma string' })
  access_token: string;

  @ApiProperty({
    description: 'Nome para identificar esta conexão WhatsApp',
    example: 'Meu WhatsApp Principal',
    required: false,
  })
  @IsString({ message: 'Nome deve ser uma string' })
  name?: string;
}
