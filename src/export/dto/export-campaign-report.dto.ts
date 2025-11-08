import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsNotEmpty, IsNumber, IsOptional, IsString } from 'class-validator';
import { Type } from 'class-transformer';

/**
 * ExportCampaignReportDto
 *
 * DTO para exportação de relatório de campanha
 * Gera CSV com métricas detalhadas da campanha
 */
export class ExportCampaignReportDto {
  @ApiProperty({
    description: 'ID da campanha a exportar relatório',
    example: 1,
    type: Number,
    required: true,
  })
  @IsNotEmpty({ message: 'O campo campaign_id é obrigatório.' })
  @Type(() => Number)
  @IsNumber({}, { message: 'O campo campaign_id deve ser um número.' })
  campaign_id: number;

  @ApiPropertyOptional({
    description: 'Formato do relatório',
    example: 'csv',
    enum: ['csv', 'xlsx'],
    default: 'csv',
  })
  @IsOptional()
  @IsString()
  format?: string;

  @ApiPropertyOptional({
    description: 'Incluir mensagens enviadas no relatório',
    example: 'true',
    type: Boolean,
    default: true,
  })
  @IsOptional()
  include_messages?: boolean;
}
