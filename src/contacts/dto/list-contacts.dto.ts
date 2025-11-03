import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsString, IsIn, IsArray } from 'class-validator';
import { Type, Transform } from 'class-transformer';

/**
 * List Contacts DTO
 * Query parameters for GET /api/v1/contacts
 * Compatible with Laravel ContactsController::index()
 */
export class ListContactsDto {
  @ApiPropertyOptional({
    description:
      'Buscar por nome ou número do contato (busca com LIKE em name e number)',
    example: 'João',
    type: String,
  })
  @IsOptional()
  @IsString()
  search?: string;

  @ApiPropertyOptional({
    description:
      'Filtrar por status do contato. Pode ser um único valor ou array. ' +
      'Status: 1=Ativo, 2=Bloqueado, 3=Inativo',
    example: '1',
    type: String,
    enum: ['1', '2', '3'],
  })
  @IsOptional()
  @Transform(({ value }) => {
    // Se for array, retorna array
    if (Array.isArray(value)) {
      return value;
    }
    // Se for string, retorna string
    return value;
  })
  status?: string | string[];

  @ApiPropertyOptional({
    description:
      'Filtrar por tag/label (busca com LIKE em labelsName). ' +
      'Campo labelsName contém nomes das labels separados por vírgula',
    example: 'vip',
    type: String,
  })
  @IsOptional()
  @IsString()
  tag?: string;
}
