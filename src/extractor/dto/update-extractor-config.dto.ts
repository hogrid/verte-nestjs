import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsBoolean, IsOptional, IsArray, IsInt, Min } from 'class-validator';
import { Type } from 'class-transformer';

export class UpdateExtractorConfigDto {
  @ApiPropertyOptional({
    description: 'Habilitar extrator',
    example: true,
  })
  @IsOptional()
  @IsBoolean()
  enabled?: boolean;

  @ApiPropertyOptional({
    description: 'Extração automática',
    example: true,
  })
  @IsOptional()
  @IsBoolean()
  auto_extract?: boolean;

  @ApiPropertyOptional({
    description: 'Extrair de grupos',
    example: false,
  })
  @IsOptional()
  @IsBoolean()
  extract_from_groups?: boolean;

  @ApiPropertyOptional({
    description: 'Palavras-chave para filtro',
    example: ['importante', 'urgente'],
    type: [String],
  })
  @IsOptional()
  @IsArray()
  filter_keywords?: string[];

  @ApiPropertyOptional({
    description: 'Máximo de contatos por dia',
    example: 100,
    minimum: 1,
  })
  @IsOptional()
  @Type(() => Number)
  @IsInt({ message: 'O campo max_contacts_per_day deve ser um número inteiro' })
  @Min(1, { message: 'O campo max_contacts_per_day deve ser maior que 0' })
  max_contacts_per_day?: number;
}
