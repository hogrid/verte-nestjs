import { ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsOptional,
  IsString,
  IsEmail,
  IsNumber,
  MinLength,
  MaxLength,
  IsEnum,
} from 'class-validator';
import { UserStatus } from '../../database/entities/user.entity';

/**
 * UpdateCustomerDto
 *
 * DTO para atualização de cliente pelo admin
 * Todos os campos são opcionais
 */
export class UpdateCustomerDto {
  @ApiPropertyOptional({
    description: 'Nome do cliente',
    example: 'João Silva',
    type: String,
  })
  @IsOptional()
  @IsString({ message: 'O campo nome deve ser uma string.' })
  @MaxLength(255, {
    message: 'O campo nome deve ter no máximo 255 caracteres.',
  })
  name?: string;

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
    description: 'Email do cliente',
    example: 'joao.novo@empresa.com',
    type: String,
  })
  @IsOptional()
  @IsEmail({}, { message: 'O campo email deve ser um email válido.' })
  email?: string;

  @ApiPropertyOptional({
    description: 'Nova senha do cliente',
    example: 'novasenha123',
    type: String,
  })
  @IsOptional()
  @IsString()
  @MinLength(8, { message: 'O campo senha deve ter no mínimo 8 caracteres.' })
  password?: string;

  @ApiPropertyOptional({
    description: 'ID do novo plano',
    example: 2,
    type: Number,
  })
  @IsOptional()
  @IsNumber({}, { message: 'O campo plan_id deve ser um número.' })
  plan_id?: number;

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

  @ApiPropertyOptional({
    description: 'Status do cliente',
    example: 'actived',
    enum: UserStatus,
  })
  @IsOptional()
  @IsEnum(UserStatus, {
    message: 'O campo status deve ser "actived" ou "inactived".',
  })
  status?: UserStatus;

  @ApiPropertyOptional({
    description: 'Ativar ou desativar cliente (0 ou 1)',
    example: 1,
    type: Number,
  })
  @IsOptional()
  @IsNumber()
  active?: number;
}
