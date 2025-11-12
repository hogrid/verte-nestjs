import { IsNotEmpty, IsString, IsOptional, IsInt } from 'class-validator';
import { Type } from 'class-transformer';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

/**
 * Create Simplified Public DTO
 * Data for creating a simplified public (WhatsApp group/list)
 *
 * Campos setados automaticamente (NÃO enviar):
 * - user_id: Pego do usuário autenticado
 * - status: 0 (processando)
 * - number_id: Setado baseado no numberId informado ou número ativo
 * - created_at, updated_at: Timestamps automáticos
 *
 * Laravel: CampaignsController@store_simplified_public (lines 124-170)
 */
export class CreateSimplifiedPublicDto {
  @ApiProperty({
    description: 'UUID do público simplificado (gerado pelo frontend)',
    example: '550e8400-e29b-41d4-a716-446655440000',
  })
  @IsNotEmpty({ message: 'O campo id é obrigatório.' })
  // Aceita número (id de public) ou string (uuid)
  id: any;

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
