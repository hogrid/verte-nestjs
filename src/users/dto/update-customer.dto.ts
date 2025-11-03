import {
  IsEmail,
  IsString,
  MinLength,
  IsOptional,
  IsEnum,
  IsNumber,
} from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsUnique } from '../../common/validators/is-unique.validator';
import { IsCpfOrCnpj } from '../../common/validators/is-cpf-or-cnpj.validator';
import { UserProfile } from '../../database/entities/user.entity';

/**
 * Update Customer DTO
 * Validates PUT /api/v1/config/customers/:id request body (admin only)
 * All fields are optional for partial updates
 * Password updates are NOT included (use separate endpoint)
 */
export class UpdateCustomerDto {
  @ApiPropertyOptional({
    description: 'Nome do cliente',
    example: 'João Silva',
    type: String,
  })
  @IsOptional()
  @IsString()
  name?: string;

  @ApiPropertyOptional({
    description: 'Sobrenome do cliente',
    example: 'Santos',
    type: String,
  })
  @IsOptional()
  @IsString()
  last_name?: string;

  @ApiPropertyOptional({
    description: 'Email do cliente (deve ser único)',
    example: 'joao.silva@exemplo.com',
    type: String,
  })
  @IsOptional()
  @IsEmail({}, { message: 'O email informado não é válido.' })
  @IsUnique('users', 'email')
  email?: string;

  @ApiPropertyOptional({
    description: 'Número de celular com DDD',
    example: '11987654321',
    type: String,
  })
  @IsOptional()
  @IsString()
  cel?: string;

  @ApiPropertyOptional({
    description: 'CPF (11 dígitos) ou CNPJ (14 dígitos) válido',
    example: '52998224725',
    type: String,
  })
  @IsOptional()
  @IsString()
  @IsCpfOrCnpj()
  cpfCnpj?: string;

  @ApiPropertyOptional({
    description: 'ID do plano a ser associado ao cliente',
    example: 1,
    type: Number,
  })
  @IsOptional()
  @IsNumber({}, { message: 'O plan_id deve ser um número.' })
  plan_id?: number;

  @ApiPropertyOptional({
    description: 'Perfil do cliente: "user" ou "administrator"',
    example: 'user',
    enum: UserProfile,
    enumName: 'UserProfile',
  })
  @IsOptional()
  @IsEnum(UserProfile, {
    message:
      'O campo profile deve ser "user" ou "administrator". Valores aceitos: user, administrator',
  })
  profile?: UserProfile;
}
