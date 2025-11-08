import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsString, IsNumber } from 'class-validator';
import { Type } from 'class-transformer';

/**
 * ListCustomersDto
 *
 * DTO para listagem de clientes (admin only)
 */
export class ListCustomersDto {
  @ApiPropertyOptional({
    description: 'Buscar por nome, email ou CPF/CNPJ',
    example: 'João Silva',
    type: String,
  })
  @IsOptional()
  @IsString()
  search?: string;

  @ApiPropertyOptional({
    description: 'Filtrar por plano',
    example: 1,
    type: Number,
  })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  plan_id?: number;

  @ApiPropertyOptional({
    description: 'Filtrar por status',
    example: 'actived',
    enum: ['actived', 'inactived'],
  })
  @IsOptional()
  @IsString()
  status?: string;

  @ApiPropertyOptional({
    description: 'Página atual',
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
