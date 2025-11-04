import { IsNotEmpty, IsString, IsOptional, IsInt, IsArray } from 'class-validator';
import { Type } from 'class-transformer';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

/**
 * Create Label Public DTO
 * Data for creating a simplified public filtered by labels
 *
 * Campos setados automaticamente (NÃO enviar):
 * - user_id: Pego do usuário autenticado
 * - status: 0 (processando)
 * - number_id: Setado baseado no numberId informado ou número ativo
 * - created_at, updated_at: Timestamps automáticos
 *
 * Laravel: CampaignsController@store_label_public (lines 753-803)
 */
export class CreateLabelPublicDto {
  @ApiProperty({
    description: 'UUID do público (gerado pelo frontend)',
    example: '550e8400-e29b-41d4-a716-446655440000',
  })
  @IsNotEmpty({ message: 'O campo id é obrigatório.' })
  @IsString()
  id: string;

  @ApiProperty({
    description: 'Etiquetas para filtrar contatos',
    example: ['VIP', 'Cliente'],
    type: [String],
  })
  @IsNotEmpty({ message: 'O campo etiquetas é obrigatório.' })
  @IsArray()
  label: string[];

  @ApiPropertyOptional({
    description: 'ID do número WhatsApp (se não informado, usa o número ativo)',
    example: 1,
    type: Number,
  })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  numberId?: number;
}
