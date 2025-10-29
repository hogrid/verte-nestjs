import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsString,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsIn,
  MinLength,
  MaxLength,
  Min,
} from 'class-validator';

/**
 * DTO for creating a new plan
 * Compatible with Laravel PlansController@store
 */
export class CreatePlanDto {
  @ApiProperty({
    description: 'Nome do plano',
    example: 'Plano Premium',
    minLength: 3,
    maxLength: 255,
  })
  @IsString({ message: 'O campo name deve ser uma string.' })
  @IsNotEmpty({ message: 'O campo name é obrigatório.' })
  @MinLength(3, { message: 'O campo name deve ter no mínimo 3 caracteres.' })
  @MaxLength(255, { message: 'O campo name deve ter no máximo 255 caracteres.' })
  name: string;

  @ApiProperty({
    description: 'Valor do plano (preço cheio)',
    example: 199.9,
    minimum: 0,
  })
  @IsNumber({}, { message: 'O campo value deve ser um número.' })
  @IsNotEmpty({ message: 'O campo value é obrigatório.' })
  @Min(0, { message: 'O campo value deve ser maior ou igual a 0.' })
  value: number;

  @ApiProperty({
    description: 'Valor promocional do plano',
    example: 149.9,
    minimum: 0,
  })
  @IsNumber({}, { message: 'O campo value_promotion deve ser um número.' })
  @IsNotEmpty({ message: 'O campo value_promotion é obrigatório.' })
  @Min(0, { message: 'O campo value_promotion deve ser maior ou igual a 0.' })
  value_promotion: number;

  @ApiProperty({
    description: 'Plano ilimitado (0 = não, 1 = sim)',
    example: 0,
    enum: [0, 1],
  })
  @IsNumber({}, { message: 'O campo unlimited deve ser 0 ou 1.' })
  @IsNotEmpty({ message: 'O campo unlimited é obrigatório.' })
  @IsIn([0, 1], { message: 'O campo unlimited deve ser 0 ou 1.' })
  unlimited: number;

  @ApiProperty({
    description: 'Quantidade de mídias permitidas',
    example: 5,
    minimum: 0,
  })
  @IsNumber({}, { message: 'O campo medias deve ser um número.' })
  @IsNotEmpty({ message: 'O campo medias é obrigatório.' })
  @Min(0, { message: 'O campo medias deve ser maior ou igual a 0.' })
  medias: number;

  @ApiProperty({
    description: 'Quantidade de relatórios permitidos',
    example: 10,
    minimum: 0,
  })
  @IsNumber({}, { message: 'O campo reports deve ser um número.' })
  @IsNotEmpty({ message: 'O campo reports é obrigatório.' })
  @Min(0, { message: 'O campo reports deve ser maior ou igual a 0.' })
  reports: number;

  @ApiProperty({
    description: 'Agendamento habilitado (0 = não, 1 = sim)',
    example: 1,
    enum: [0, 1],
  })
  @IsNumber({}, { message: 'O campo schedule deve ser 0 ou 1.' })
  @IsNotEmpty({ message: 'O campo schedule é obrigatório.' })
  @IsIn([0, 1], { message: 'O campo schedule deve ser 0 ou 1.' })
  schedule: number;

  @ApiPropertyOptional({
    description: 'Plano popular/destacado (0 = não, 1 = sim)',
    example: 0,
    enum: [0, 1],
    default: 0,
  })
  @IsOptional()
  @IsNumber({}, { message: 'O campo popular deve ser 0 ou 1.' })
  @IsIn([0, 1], { message: 'O campo popular deve ser 0 ou 1.' })
  popular?: number;

  @ApiPropertyOptional({
    description: 'Código do MercadoPago (para integração futura)',
    example: 'MP-PLAN-001',
  })
  @IsOptional()
  @IsString({ message: 'O campo code_mp deve ser uma string.' })
  @MaxLength(255, { message: 'O campo code_mp deve ter no máximo 255 caracteres.' })
  code_mp?: string;

  @ApiPropertyOptional({
    description: 'Código do produto (para integração futura)',
    example: 'PROD-001',
  })
  @IsOptional()
  @IsString({ message: 'O campo code_product deve ser uma string.' })
  @MaxLength(255, { message: 'O campo code_product deve ter no máximo 255 caracteres.' })
  code_product?: string;
}
