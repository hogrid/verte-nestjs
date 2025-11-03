import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsString, IsInt, IsNumberString } from 'class-validator';
import { Type } from 'class-transformer';

/**
 * DTO for listing publics with pagination and filters
 *
 * Query parameters:
 * - numberId: Filter by WhatsApp number instance
 * - search: Search by public name
 * - page: Page number for pagination (default: 1)
 */
export class ListPublicsDto {
  @ApiPropertyOptional({
    description: 'ID da instância WhatsApp para filtrar',
    example: 1,
  })
  @IsOptional()
  @IsNumberString({}, { message: 'O campo numberId deve ser um número.' })
  numberId?: string;

  @ApiPropertyOptional({
    description: 'Termo de busca para filtrar por nome do público',
    example: 'Clientes VIP',
  })
  @IsOptional()
  @IsString({ message: 'O campo search deve ser uma string.' })
  search?: string;

  @ApiPropertyOptional({
    description: 'Número da página para paginação',
    example: 1,
  })
  @IsOptional()
  @IsInt({ message: 'O campo page deve ser um número inteiro.' })
  @Type(() => Number)
  page?: number;
}
