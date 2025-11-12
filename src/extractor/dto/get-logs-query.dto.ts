import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsString, IsInt, Min } from 'class-validator';
import { Type } from 'class-transformer';

export class GetLogsQueryDto {
  @ApiPropertyOptional({
    description: 'Data inicial (YYYY-MM-DD)',
    example: '2024-01-01',
  })
  @IsOptional()
  @IsString()
  start_date?: string;

  @ApiPropertyOptional({
    description: 'Data final (YYYY-MM-DD)',
    example: '2024-12-31',
  })
  @IsOptional()
  @IsString()
  end_date?: string;

  @ApiPropertyOptional({
    description: 'Status do log',
    example: 'success',
  })
  @IsOptional()
  @IsString()
  status?: string;

  @ApiPropertyOptional({
    description: 'Página',
    example: 1,
  })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page?: number;

  @ApiPropertyOptional({
    description: 'Registros por página',
    example: 10,
  })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  per_page?: number;
}
