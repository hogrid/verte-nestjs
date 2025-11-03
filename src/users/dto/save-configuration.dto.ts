import { IsNumber, IsOptional, Min } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';

/**
 * Save Configuration DTO
 * Validates POST /api/v1/save-configuration request body
 * Allows authenticated users to save their personal configuration settings
 */
export class SaveConfigurationDto {
  @ApiPropertyOptional({
    description:
      'Tempo de atraso entre envios (em segundos). Usado para controlar o intervalo entre mensagens.',
    example: 30,
    type: Number,
    minimum: 1,
    default: 30,
  })
  @IsOptional()
  @IsNumber({}, { message: 'O timer_delay deve ser um número.' })
  @Min(1, { message: 'O timer_delay deve ser no mínimo 1 segundo.' })
  timer_delay?: number;
}
