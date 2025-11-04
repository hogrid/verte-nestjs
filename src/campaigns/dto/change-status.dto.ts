import { ApiProperty } from '@nestjs/swagger';
import { IsInt, IsIn, IsNotEmpty } from 'class-validator';
import { Type } from 'class-transformer';

/**
 * ChangeStatusDto
 *
 * DTO para alterar o status de uma campanha.
 * Laravel: CampaignsController@change_status (POST /api/v1/campaigns/change-status)
 *
 * Campos aceitos:
 * - campaign_id (obrigatório): ID da campanha
 * - status (obrigatório): Novo status (0=ativa, 1=pausada, 2=cancelada)
 *
 * Regras de transição de status:
 * - Pausada (1) → Ativa (0): Permitido
 * - Ativa (0) → Pausada (1): Permitido
 * - Qualquer → Cancelada (2): Permitido (irreversível)
 * - Cancelada (2) → Qualquer: NÃO permitido
 *
 * Campos setados automaticamente:
 * - updated_at: Timestamp automático
 */
export class ChangeStatusDto {
  @ApiProperty({
    description: 'ID da campanha',
    example: 1,
    type: Number,
  })
  @IsNotEmpty({ message: 'O campo campaign_id é obrigatório.' })
  @Type(() => Number)
  @IsInt({ message: 'O campo campaign_id deve ser um número inteiro.' })
  campaign_id: number;

  @ApiProperty({
    description:
      'Novo status da campanha (0=ativa, 1=pausada, 2=cancelada/finalizada)',
    example: 1,
    enum: [0, 1, 2],
    type: Number,
  })
  @IsNotEmpty({ message: 'O campo status é obrigatório.' })
  @Type(() => Number)
  @IsIn([0, 1, 2], {
    message: 'O campo status deve ser 0 (ativa), 1 (pausada) ou 2 (cancelada).',
  })
  status: number;
}
