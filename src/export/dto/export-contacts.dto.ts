import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsString, IsArray } from 'class-validator';

/**
 * ExportContactsDto
 *
 * DTO para exportação de contatos em CSV
 * Permite filtrar quais contatos exportar
 */
export class ExportContactsDto {
  @ApiPropertyOptional({
    description: 'IDs dos contatos a exportar (se vazio, exporta todos)',
    example: [1, 2, 3],
    type: [Number],
  })
  @IsOptional()
  @IsArray()
  contact_ids?: number[];

  @ApiPropertyOptional({
    description: 'Filtrar por label/etiqueta',
    example: 'clientes-vip',
    type: String,
  })
  @IsOptional()
  @IsString()
  label?: string;

  @ApiPropertyOptional({
    description: 'Filtrar por status (active, blocked)',
    example: 'active',
    enum: ['active', 'blocked'],
  })
  @IsOptional()
  @IsString()
  status?: string;

  @ApiPropertyOptional({
    description: 'Buscar por nome, email ou telefone',
    example: 'João',
    type: String,
  })
  @IsOptional()
  @IsString()
  search?: string;
}
