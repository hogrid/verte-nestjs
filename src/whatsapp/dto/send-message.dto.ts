import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsString, IsOptional, IsNumber } from 'class-validator';

/**
 * DTO para enviar mensagem de texto
 */
export class SendTextMessageDto {
  @ApiProperty({
    description: 'ID do número WhatsApp (da tabela numbers)',
    example: 1,
  })
  @IsNotEmpty({ message: 'number_id é obrigatório' })
  @IsNumber({}, { message: 'number_id deve ser um número' })
  number_id: number;

  @ApiProperty({
    description: 'Número do destinatário (com código do país)',
    example: '+5511999999999',
  })
  @IsNotEmpty({ message: 'Destinatário é obrigatório' })
  @IsString({ message: 'Destinatário deve ser uma string' })
  to: string;

  @ApiProperty({
    description: 'Texto da mensagem',
    example: 'Olá! Como posso ajudar?',
  })
  @IsNotEmpty({ message: 'Mensagem é obrigatória' })
  @IsString({ message: 'Mensagem deve ser uma string' })
  text: string;
}

/**
 * DTO para enviar template
 */
export class SendTemplateMessageDto {
  @ApiProperty({
    description: 'ID do número WhatsApp (da tabela numbers)',
    example: 1,
  })
  @IsNotEmpty({ message: 'number_id é obrigatório' })
  @IsNumber({}, { message: 'number_id deve ser um número' })
  number_id: number;

  @ApiProperty({
    description: 'Número do destinatário (com código do país)',
    example: '+5511999999999',
  })
  @IsNotEmpty({ message: 'Destinatário é obrigatório' })
  @IsString({ message: 'Destinatário deve ser uma string' })
  to: string;

  @ApiProperty({
    description: 'Nome do template aprovado',
    example: 'hello_world',
  })
  @IsNotEmpty({ message: 'Nome do template é obrigatório' })
  @IsString({ message: 'Nome do template deve ser uma string' })
  template_name: string;

  @ApiProperty({
    description: 'Código do idioma',
    example: 'pt_BR',
    default: 'pt_BR',
  })
  @IsOptional()
  @IsString({ message: 'Código do idioma deve ser uma string' })
  language_code?: string;

  @ApiProperty({
    description: 'Parâmetros do template',
    example: [
      { type: 'text', text: 'João' },
      { type: 'text', text: 'Silva' },
    ],
    required: false,
  })
  @IsOptional()
  parameters?: Array<{ type: string; text: string }>;
}

/**
 * DTO para enviar imagem
 */
export class SendImageMessageDto {
  @ApiProperty({
    description: 'ID do número WhatsApp (da tabela numbers)',
    example: 1,
  })
  @IsNotEmpty({ message: 'number_id é obrigatório' })
  @IsNumber({}, { message: 'number_id deve ser um número' })
  number_id: number;

  @ApiProperty({
    description: 'Número do destinatário (com código do país)',
    example: '+5511999999999',
  })
  @IsNotEmpty({ message: 'Destinatário é obrigatório' })
  @IsString({ message: 'Destinatário deve ser uma string' })
  to: string;

  @ApiProperty({
    description: 'URL da imagem (deve ser publicamente acessível)',
    example: 'https://example.com/image.jpg',
  })
  @IsNotEmpty({ message: 'URL da imagem é obrigatória' })
  @IsString({ message: 'URL da imagem deve ser uma string' })
  image_url: string;

  @ApiProperty({
    description: 'Legenda da imagem',
    example: 'Confira nossa promoção!',
    required: false,
  })
  @IsOptional()
  @IsString({ message: 'Legenda deve ser uma string' })
  caption?: string;
}
