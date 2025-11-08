import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsString, IsNumber } from 'class-validator';
import { Type } from 'class-transformer';

/**
 * ListTemplatesDto
 *
 * DTO para listagem e filtragem de templates
 */
export class ListTemplatesDto {
  @ApiPropertyOptional({
    description: 'Buscar por nome ou conteúdo do template',
    example: 'boas-vindas',
    type: String,
  })
  @IsOptional()
  @IsString()
  search?: string;

  @ApiPropertyOptional({
    description: 'Filtrar por categoria',
    example: 'marketing',
    enum: ['marketing', 'support', 'notification', 'sales', 'other'],
  })
  @IsOptional()
  @IsString()
  category?: string;

  @ApiPropertyOptional({
    description: 'Filtrar por status (1 = ativo, 0 = inativo)',
    example: 1,
    type: Number,
  })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  active?: number;

  @ApiPropertyOptional({
    description: 'Página atual (paginação)',
    example: 1,
    type: Number,
    default: 1,
  })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  page?: number;

  @ApiPropertyOptional({
    description: 'Itens por página',
    example: 15,
    type: Number,
    default: 15,
  })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  per_page?: number;
}
