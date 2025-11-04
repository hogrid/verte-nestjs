import { ApiProperty } from '@nestjs/swagger';
import { IsArray, IsInt, ArrayMinSize } from 'class-validator';
import { Type } from 'class-transformer';

/**
 * CancelMultipleCampaignsDto
 *
 * DTO para cancelar múltiplas campanhas de uma vez.
 * Laravel: CampaignsController@cancel (POST /api/v1/campaigns-check)
 *
 * Campos aceitos:
 * - campaign_ids (obrigatório): Array de IDs das campanhas a cancelar
 *
 * Campos setados automaticamente:
 * - status: 2 (cancelada) para todas as campanhas
 * - canceled: 1 para todas as campanhas
 * - updated_at: Timestamp automático
 */
export class CancelMultipleCampaignsDto {
  @ApiProperty({
    description: 'Array de IDs das campanhas a cancelar',
    example: [1, 2, 3],
    type: [Number],
    isArray: true,
    minItems: 1,
  })
  @IsArray({ message: 'O campo campaign_ids deve ser um array.' })
  @ArrayMinSize(1, {
    message: 'Pelo menos uma campanha deve ser selecionada.',
  })
  @Type(() => Number)
  @IsInt({ each: true, message: 'Todos os IDs devem ser números inteiros.' })
  campaign_ids: number[];
}
