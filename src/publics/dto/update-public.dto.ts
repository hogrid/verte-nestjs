import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsString, IsInt, MaxLength } from 'class-validator';
import { Type } from 'class-transformer';

/**
 * DTO for updating a public
 *
 * Fields:
 * - name: Name of the public
 * - status: Active status (0 or 1). If set to 1, all other publics become inactive
 * - photo: Photo file (handled separately as multipart/form-data)
 * - from_chat: Indicates if public is from chat
 * - from_tag: Indicates if public is from tag
 * - number: WhatsApp number associated
 * - labels: Labels associated with the public
 *
 * Note: photo is uploaded as multipart/form-data
 */
export class UpdatePublicDto {
  @ApiPropertyOptional({
    description: 'Nome do público',
    example: 'Clientes VIP',
    maxLength: 200,
  })
  @IsOptional()
  @IsString({ message: 'O campo name deve ser uma string.' })
  @MaxLength(200, {
    message: 'O campo name deve ter no máximo 200 caracteres.',
  })
  name?: string;

  @ApiPropertyOptional({
    description:
      'Status do público (0 = inativo, 1 = ativo). Se 1, todos os outros públicos ficam inativos',
    example: 1,
  })
  @IsOptional()
  @IsInt({ message: 'O campo status deve ser um número inteiro.' })
  @Type(() => Number)
  status?: number;

  @ApiPropertyOptional({
    description: 'Indica se o público é proveniente de chat (0 ou 1)',
    example: 0,
  })
  @IsOptional()
  @IsInt({ message: 'O campo from_chat deve ser um número inteiro.' })
  @Type(() => Number)
  from_chat?: number;

  @ApiPropertyOptional({
    description: 'Indica se o público é proveniente de tag',
    example: null,
  })
  @IsOptional()
  @IsInt({ message: 'O campo from_tag deve ser um número inteiro.' })
  @Type(() => Number)
  from_tag?: number;

  @ApiPropertyOptional({
    description: 'Número WhatsApp associado ao público',
    example: '5511999999999',
  })
  @IsOptional()
  @IsString({ message: 'O campo number deve ser uma string.' })
  number?: string;

  @ApiPropertyOptional({
    description: 'Labels associadas ao público (formato JSON ou string)',
    example: '["vip","cliente"]',
  })
  @IsOptional()
  @IsString({ message: 'O campo labels deve ser uma string.' })
  labels?: string;
}
