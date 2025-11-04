import { IsOptional, IsString, IsInt, IsIn } from 'class-validator';
import { Type } from 'class-transformer';
import { ApiPropertyOptional } from '@nestjs/swagger';

/**
 * List Campaigns DTO
 * Query parameters for listing campaigns
 */
export class ListCampaignsDto {
  @ApiPropertyOptional({
    description: 'ID do número WhatsApp (se não informado, usa o número ativo)',
    example: 1,
    type: Number,
  })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  numberId?: number;

  @ApiPropertyOptional({
    description: 'Termo de busca no nome da campanha',
    example: 'Black Friday',
  })
  @IsOptional()
  @IsString()
  search?: string;

  @ApiPropertyOptional({
    description: 'Filtros avançados em formato JSON',
    example: '[{"field":"status","value":"0"},{"field":"type","value":"1"}]',
  })
  @IsOptional()
  @IsString()
  filterFields?: string;

  @ApiPropertyOptional({
    description: 'Ordenação (asc ou desc)',
    example: 'desc',
    enum: ['asc', 'desc'],
  })
  @IsOptional()
  @IsIn(['asc', 'desc'])
  order?: 'asc' | 'desc';

  @ApiPropertyOptional({
    description: 'Número de itens por página',
    example: 10,
    type: Number,
    default: 10,
  })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  per_page?: number;

  @ApiPropertyOptional({
    description: 'Número da página',
    example: 1,
    type: Number,
  })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  page?: number;
}
