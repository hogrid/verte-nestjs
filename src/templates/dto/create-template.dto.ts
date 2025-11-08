import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsNotEmpty,
  IsString,
  IsOptional,
  IsArray,
  IsNumber,
  MaxLength,
} from 'class-validator';

/**
 * CreateTemplateDto
 *
 * DTO para criação de templates de mensagens reutilizáveis
 * Suporta variáveis dinâmicas (ex: {{nome}}, {{empresa}})
 *
 * Campos setados automaticamente (NÃO enviar):
 * - user_id: obtido do usuário autenticado
 * - active: 1 (ativo por padrão)
 * - created_at, updated_at: timestamps automáticos
 */
export class CreateTemplateDto {
  @ApiProperty({
    description: 'Nome do template',
    example: 'Boas-vindas Cliente',
    type: String,
    required: true,
  })
  @IsNotEmpty({ message: 'O campo nome é obrigatório.' })
  @IsString({ message: 'O campo nome deve ser uma string.' })
  @MaxLength(255, { message: 'O campo nome deve ter no máximo 255 caracteres.' })
  name: string;

  @ApiProperty({
    description: 'Conteúdo do template com variáveis opcionais (ex: Olá {{nome}})',
    example: 'Olá {{nome}}, bem-vindo à {{empresa}}! Como podemos ajudar?',
    type: String,
    required: true,
  })
  @IsNotEmpty({ message: 'O campo conteúdo é obrigatório.' })
  @IsString({ message: 'O campo conteúdo deve ser uma string.' })
  content: string;

  @ApiPropertyOptional({
    description: 'Categoria do template',
    example: 'marketing',
    enum: ['marketing', 'support', 'notification', 'sales', 'other'],
    required: false,
  })
  @IsOptional()
  @IsString({ message: 'O campo categoria deve ser uma string.' })
  @MaxLength(50, { message: 'O campo categoria deve ter no máximo 50 caracteres.' })
  category?: string;

  @ApiPropertyOptional({
    description: 'Lista de variáveis disponíveis no template',
    example: ['nome', 'empresa', 'data'],
    type: [String],
    required: false,
  })
  @IsOptional()
  @IsArray({ message: 'O campo variáveis deve ser um array.' })
  @IsString({ each: true, message: 'Cada variável deve ser uma string.' })
  variables?: string[];

  @ApiPropertyOptional({
    description: 'Status do template (1 = ativo, 0 = inativo)',
    example: 1,
    type: Number,
    required: false,
    default: 1,
  })
  @IsOptional()
  @IsNumber({}, { message: 'O campo ativo deve ser um número.' })
  active?: number;
}
