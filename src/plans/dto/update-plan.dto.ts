import { ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsString,
  IsNumber,
  IsOptional,
  IsIn,
  MinLength,
  MaxLength,
  Min,
} from 'class-validator';

/**
 * DTO for updating an existing plan
 * Compatible with Laravel PlansController@update
 * All fields are optional for partial updates
 */
export class UpdatePlanDto {
  @ApiPropertyOptional({
    description: 'Nome do plano',
    example: 'Plano Premium Atualizado',
    minLength: 3,
    maxLength: 255,
  })
  @IsOptional()
  @IsString({ message: 'O campo name deve ser uma string.' })
  @MinLength(3, { message: 'O campo name deve ter no mínimo 3 caracteres.' })
  @MaxLength(255, { message: 'O campo name deve ter no máximo 255 caracteres.' })
  name?: string;

  @ApiPropertyOptional({
    description: 'Valor do plano (preço cheio)',
    example: 249.9,
    minimum: 0,
  })
  @IsOptional()
  @IsNumber({}, { message: 'O campo value deve ser um número.' })
  @Min(0, { message: 'O campo value deve ser maior ou igual a 0.' })
  value?: number;

  @ApiPropertyOptional({
    description: 'Valor promocional do plano',
    example: 199.9,
    minimum: 0,
  })
  @IsOptional()
  @IsNumber({}, { message: 'O campo value_promotion deve ser um número.' })
  @Min(0, { message: 'O campo value_promotion deve ser maior ou igual a 0.' })
  value_promotion?: number;

  @ApiPropertyOptional({
    description: 'Plano ilimitado (0 = não, 1 = sim)',
    example: 1,
    enum: [0, 1],
  })
  @IsOptional()
  @IsNumber({}, { message: 'O campo unlimited deve ser 0 ou 1.' })
  @IsIn([0, 1], { message: 'O campo unlimited deve ser 0 ou 1.' })
  unlimited?: number;

  @ApiPropertyOptional({
    description: 'Quantidade de mídias permitidas',
    example: 10,
    minimum: 0,
  })
  @IsOptional()
  @IsNumber({}, { message: 'O campo medias deve ser um número.' })
  @Min(0, { message: 'O campo medias deve ser maior ou igual a 0.' })
  medias?: number;

  @ApiPropertyOptional({
    description: 'Quantidade de relatórios permitidos',
    example: 15,
    minimum: 0,
  })
  @IsOptional()
  @IsNumber({}, { message: 'O campo reports deve ser um número.' })
  @Min(0, { message: 'O campo reports deve ser maior ou igual a 0.' })
  reports?: number;

  @ApiPropertyOptional({
    description: 'Agendamento habilitado (0 = não, 1 = sim)',
    example: 1,
    enum: [0, 1],
  })
  @IsOptional()
  @IsNumber({}, { message: 'O campo schedule deve ser 0 ou 1.' })
  @IsIn([0, 1], { message: 'O campo schedule deve ser 0 ou 1.' })
  schedule?: number;

  @ApiPropertyOptional({
    description: 'Plano popular/destacado (0 = não, 1 = sim)',
    example: 1,
    enum: [0, 1],
  })
  @IsOptional()
  @IsNumber({}, { message: 'O campo popular deve ser 0 ou 1.' })
  @IsIn([0, 1], { message: 'O campo popular deve ser 0 ou 1.' })
  popular?: number;

  @ApiPropertyOptional({
    description: 'Código do MercadoPago (para integração futura)',
    example: 'MP-PLAN-001-UPDATED',
  })
  @IsOptional()
  @IsString({ message: 'O campo code_mp deve ser uma string.' })
  @MaxLength(255, { message: 'O campo code_mp deve ter no máximo 255 caracteres.' })
  code_mp?: string;

  @ApiPropertyOptional({
    description: 'Código do produto (para integração futura)',
    example: 'PROD-001-UPDATED',
  })
  @IsOptional()
  @IsString({ message: 'O campo code_product deve ser uma string.' })
  @MaxLength(255, { message: 'O campo code_product deve ter no máximo 255 caracteres.' })
  code_product?: string;
}
