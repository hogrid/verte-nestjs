import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsNotEmpty,
  IsString,
  IsEmail,
  IsInt,
  MinLength,
  MaxLength,
  IsOptional,
} from 'class-validator';
import { IsUnique } from '../../common/validators/is-unique.validator';
import { Type } from 'class-transformer';

/**
 * CreateCustomerDto
 *
 * DTO para criação de cliente pelo admin
 * Admin pode criar usuários diretamente com plano atribuído
 */
export class CreateCustomerDto {
  @ApiProperty({
    description: 'Nome completo do cliente',
    example: 'João Silva',
    type: String,
    required: true,
  })
  @IsNotEmpty({ message: 'O campo nome é obrigatório.' })
  @IsString({ message: 'O campo nome deve ser uma string.' })
  @MaxLength(255, {
    message: 'O campo nome deve ter no máximo 255 caracteres.',
  })
  name: string;

  @ApiProperty({
    description: 'Email do cliente',
    example: 'joao@empresa.com',
    type: String,
    required: true,
  })
  @IsNotEmpty({ message: 'O campo email é obrigatório.' })
  @IsEmail({}, { message: 'O campo email deve ser um email válido.' })
  email: string;

  @ApiProperty({
    description: 'Senha do cliente',
    example: 'senha123456',
    type: String,
    required: true,
  })
  @IsNotEmpty({ message: 'O campo senha é obrigatório.' })
  @IsString({ message: 'O campo senha deve ser uma string.' })
  @MinLength(8, { message: 'O campo senha deve ter no mínimo 8 caracteres.' })
  password: string;

  @ApiProperty({
    description: 'ID do plano a ser atribuído',
    example: 1,
    type: Number,
    required: true,
  })
  @IsNotEmpty({ message: 'O campo plan_id é obrigatório.' })
  @Type(() => Number)
  @IsInt({ message: 'O campo plan_id deve ser um número inteiro.' })
  plan_id: number;

  @ApiPropertyOptional({
    description: 'Sobrenome do cliente',
    example: 'Silva',
    type: String,
  })
  @IsOptional()
  @IsString()
  @MaxLength(255)
  last_name?: string;

  @ApiPropertyOptional({
    description: 'CPF ou CNPJ do cliente',
    example: '12345678900',
    type: String,
  })
  @IsOptional()
  @IsString()
  cpfCnpj?: string;

  @ApiPropertyOptional({
    description: 'Telefone do cliente',
    example: '11999999999',
    type: String,
  })
  @IsOptional()
  @IsString()
  cel?: string;
}
