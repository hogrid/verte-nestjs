import { ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsOptional,
  IsString,
  IsArray,
  IsNumber,
  MaxLength,
} from 'class-validator';

/**
 * UpdateTemplateDto
 *
 * DTO para atualização de templates de mensagens
 * Todos os campos são opcionais
 */
export class UpdateTemplateDto {
  @ApiPropertyOptional({
    description: 'Nome do template',
    example: 'Boas-vindas Cliente VIP',
    type: String,
  })
  @IsOptional()
  @IsString({ message: 'O campo nome deve ser uma string.' })
  @MaxLength(255, { message: 'O campo nome deve ter no máximo 255 caracteres.' })
  name?: string;

  @ApiPropertyOptional({
    description: 'Conteúdo do template com variáveis opcionais',
    example: 'Olá {{nome}}, obrigado por escolher a {{empresa}}!',
    type: String,
  })
  @IsOptional()
  @IsString({ message: 'O campo conteúdo deve ser uma string.' })
  content?: string;

  @ApiPropertyOptional({
    description: 'Categoria do template',
    example: 'support',
    enum: ['marketing', 'support', 'notification', 'sales', 'other'],
  })
  @IsOptional()
  @IsString({ message: 'O campo categoria deve ser uma string.' })
  @MaxLength(50, { message: 'O campo categoria deve ter no máximo 50 caracteres.' })
  category?: string;

  @ApiPropertyOptional({
    description: 'Lista de variáveis disponíveis no template',
    example: ['nome', 'empresa', 'telefone'],
    type: [String],
  })
  @IsOptional()
  @IsArray({ message: 'O campo variáveis deve ser um array.' })
  @IsString({ each: true, message: 'Cada variável deve ser uma string.' })
  variables?: string[];

  @ApiPropertyOptional({
    description: 'Status do template (1 = ativo, 0 = inativo)',
    example: 1,
    type: Number,
  })
  @IsOptional()
  @IsNumber({}, { message: 'O campo ativo deve ser um número.' })
  active?: number;
}
