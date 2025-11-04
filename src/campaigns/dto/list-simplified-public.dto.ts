import { IsOptional, IsString, IsInt, IsArray } from 'class-validator';
import { Type } from 'class-transformer';
import { ApiPropertyOptional } from '@nestjs/swagger';

/**
 * List Simplified Public DTO
 * Query parameters for listing simplified public contacts
 *
 * Laravel: CampaignsController@index_simplified_public (lines 47-104)
 */
export class ListSimplifiedPublicDto {
  @ApiPropertyOptional({
    description: 'ID do público (obrigatório se PROJECT != verte)',
    example: 1,
    type: Number,
  })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  public_id?: number;

  @ApiPropertyOptional({
    description: 'Etiquetas para filtrar contatos (apenas quando PROJECT == verte)',
    example: ['VIP', 'Cliente'],
    type: [String],
  })
  @IsOptional()
  @IsArray()
  labels?: string[];

  @ApiPropertyOptional({
    description: 'Termo de busca (nome ou número)',
    example: 'João Silva',
  })
  @IsOptional()
  @IsString()
  search?: string;
}
