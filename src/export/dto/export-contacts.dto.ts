import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsString, IsArray } from 'class-validator';
import { Transform } from 'class-transformer';

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
  @Transform(({ value }) => {
    // Handle query string: "1" or "1,2,3" -> [1, 2, 3]
    if (typeof value === 'string') {
      return value.split(',').map((id) => parseInt(id.trim(), 10));
    }
    // Already an array
    return value;
  })
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
    description: 'Filtrar por status (active, blocked, 1, 0)',
    example: 'active',
    enum: ['active', 'blocked', '1', '0', 1, 0],
  })
  @IsOptional()
  @Transform(({ value }) => {
    // Convert number to string for validation
    if (typeof value === 'number') {
      return value === 1 ? 'active' : 'blocked';
    }
    // Convert string numbers to active/blocked
    if (value === '1') return 'active';
    if (value === '0') return 'blocked';
    return value;
  })
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
