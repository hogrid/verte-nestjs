import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsString } from 'class-validator';

/**
 * UpdateNumberDto
 *
 * DTO para atualização de número WhatsApp
 */
export class UpdateNumberDto {
  @ApiPropertyOptional({
    description: 'Nome do número/instância',
    example: 'WhatsApp Principal',
    type: String,
  })
  @IsOptional()
  @IsString()
  name?: string;

  @ApiPropertyOptional({
    description: 'Status do número (0 ou 1)',
    example: 1,
    type: Number,
  })
  @IsOptional()
  status?: number;

  @ApiPropertyOptional({
    description: 'Ativar sincronização de labels (0 ou 1)',
    example: 1,
    type: Number,
  })
  @IsOptional()
  labels_active?: number;
}
