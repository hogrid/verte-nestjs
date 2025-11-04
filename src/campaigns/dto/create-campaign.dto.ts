import {
  IsNotEmpty,
  IsString,
  IsInt,
  IsArray,
  ValidateNested,
  IsOptional,
  ArrayMinSize,
  IsDateString,
} from 'class-validator';
import { Type } from 'class-transformer';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

/**
 * Message DTO within a campaign
 */
export class CampaignMessageDto {
  @ApiProperty({
    description: 'Conteúdo da mensagem',
    example: 'Olá {nome}, tudo bem?',
  })
  @IsNotEmpty({ message: 'O campo message é obrigatório.' })
  @IsString()
  message: string;

  @ApiProperty({
    description: 'Tipo da mensagem',
    example: 'text',
    enum: ['text', 'image', 'video', 'audio', 'document'],
  })
  @IsNotEmpty({ message: 'O campo type é obrigatório.' })
  @IsString()
  type: string;

  @ApiPropertyOptional({
    description: 'Arquivo de mídia (para tipos não-text)',
    type: 'string',
    format: 'binary',
  })
  @IsOptional()
  media?: any; // Multer file será processado no controller
}

/**
 * Create Campaign DTO
 * Data for creating a new campaign
 *
 * Campos setados automaticamente (NÃO enviar no request):
 * - user_id: Pego do usuário autenticado
 * - status: 0 (pendente) ou 3 (agendada)
 * - total_contacts: Calculado automaticamente
 * - date_end: Calculado com base no plano
 * - created_at, updated_at: Timestamps automáticos
 */
export class CreateCampaignDto {
  @ApiProperty({
    description: 'Nome da campanha',
    example: 'Black Friday 2024',
  })
  @IsNotEmpty({ message: 'O campo nome é obrigatório.' })
  @IsString()
  name: string;

  @ApiProperty({
    description: 'ID do número WhatsApp',
    example: 1,
    type: Number,
  })
  @IsNotEmpty({ message: 'O campo número é obrigatório.' })
  @Type(() => Number)
  @IsInt()
  number_id: number;

  @ApiProperty({
    description: 'ID do público-alvo ou "new" para todos os contatos',
    example: 1,
  })
  @IsNotEmpty({ message: 'O campo público é obrigatório.' })
  public_id: number | string;

  @ApiProperty({
    description: 'Array de mensagens da campanha (mínimo 1)',
    type: [CampaignMessageDto],
    example: [
      {
        message: 'Olá {nome}! Aproveite nossa promoção!',
        type: 'text',
      },
    ],
  })
  @IsNotEmpty({ message: 'O campo mensagens é obrigatório.' })
  @IsArray({ message: 'O campo mensagens deve ser um array.' })
  @ArrayMinSize(1, { message: 'Pelo menos uma mensagem é obrigatória.' })
  @ValidateNested({ each: true })
  @Type(() => CampaignMessageDto)
  messages: CampaignMessageDto[];

  @ApiPropertyOptional({
    description: 'Data de agendamento (formato ISO 8601)',
    example: '2024-11-10T14:00:00',
  })
  @IsOptional()
  @IsDateString()
  schedule_date?: string;

  @ApiPropertyOptional({
    description: 'Labels para filtrar contatos (formato JSON)',
    example: '[{"label":"VIP"},{"label":"Cliente"}]',
  })
  @IsOptional()
  labels?: any; // Será parseado como JSON ou array
}
