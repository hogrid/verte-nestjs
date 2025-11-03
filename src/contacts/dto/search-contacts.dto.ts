import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsNotEmpty,
  IsString,
  MinLength,
  IsOptional,
  IsIn,
} from 'class-validator';

/**
 * Search Contacts DTO
 * Request body for POST /api/v1/contacts/search
 * Advanced search for contacts by term and type
 */
export class SearchContactsDto {
  @ApiProperty({
    description:
      'Termo de busca. Deve ter no mínimo 3 caracteres. ' +
      'Busca em nome, número ou labels dependendo do tipo especificado.',
    example: 'João Silva',
    minLength: 3,
  })
  @IsNotEmpty({ message: 'O campo query é obrigatório.' })
  @IsString({ message: 'O campo query deve ser uma string.' })
  @MinLength(3, { message: 'O campo query deve ter no mínimo 3 caracteres.' })
  query: string;

  @ApiPropertyOptional({
    description:
      'Tipo de busca. Define em qual campo será realizada a busca:\\n' +
      '- `name`: Busca no campo nome\\n' +
      '- `phone`: Busca no campo número\\n' +
      '- `label`: Busca nas labels/tags\\n' +
      'Se não especificado, busca em todos os campos.',
    example: 'name',
    enum: ['name', 'phone', 'label'],
  })
  @IsOptional()
  @IsString({ message: 'O campo type deve ser uma string.' })
  @IsIn(['name', 'phone', 'label'], {
    message: 'O campo type deve ser: name, phone ou label.',
  })
  type?: string;
}
