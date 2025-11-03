import { ApiProperty } from '@nestjs/swagger';
import {
  IsNotEmpty,
  IsString,
  MaxLength,
  IsInt,
  IsPositive,
} from 'class-validator';
import { Type } from 'class-transformer';

/**
 * DTO for Creating Label
 * POST /api/v1/labels
 *
 * Validates label creation data
 */
export class CreateLabelDto {
  @ApiProperty({
    description: 'Nome da label/etiqueta',
    example: 'Clientes VIP',
    maxLength: 150,
  })
  @IsNotEmpty({ message: 'O campo nome é obrigatório.' })
  @IsString({ message: 'O campo nome deve ser uma string.' })
  @MaxLength(150, {
    message: 'O campo nome deve ter no máximo 150 caracteres.',
  })
  name: string;

  @ApiProperty({
    description: 'ID do número WhatsApp associado',
    example: 1,
    type: Number,
  })
  @IsNotEmpty({ message: 'O campo number_id é obrigatório.' })
  @IsInt({ message: 'O campo number_id deve ser um número inteiro.' })
  @IsPositive({ message: 'O campo number_id deve ser um número positivo.' })
  @Type(() => Number)
  number_id: number;
}
