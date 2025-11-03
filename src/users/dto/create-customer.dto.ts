import {
  IsEmail,
  IsNotEmpty,
  IsString,
  MinLength,
  IsOptional,
  IsEnum,
  IsNumber,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Match } from '../../common/decorators/match.decorator';
import { IsUnique } from '../../common/validators/is-unique.validator';
import { IsCpfOrCnpj } from '../../common/validators/is-cpf-or-cnpj.validator';
import { UserProfile } from '../../database/entities/user.entity';

/**
 * Create Customer DTO
 * Validates POST /api/v1/config/customers request body (admin only)
 * Similar to RegisterDto but for admin creating customers
 *
 * Campos setados automaticamente pelo sistema:
 * - status: 'actived'
 * - confirmed_mail: 1
 * - active: 0 (aguardando ativação/pagamento)
 * - created_at, updated_at: timestamps automáticos
 *
 * O sistema também cria automaticamente:
 * - Uma instância WhatsApp (Number) com nome baseado no celular
 */
export class CreateCustomerDto {
  @ApiProperty({
    description: 'Nome do cliente (obrigatório)',
    example: 'João Silva',
    type: String,
  })
  @IsNotEmpty({ message: 'O campo nome é obrigatório.' })
  @IsString()
  name: string;

  @ApiPropertyOptional({
    description: 'Sobrenome do cliente (opcional)',
    example: 'Santos',
    type: String,
  })
  @IsOptional()
  @IsString()
  last_name?: string;

  @ApiProperty({
    description: 'Email do cliente (obrigatório e único)',
    example: 'joao.silva@exemplo.com',
    type: String,
  })
  @IsNotEmpty({ message: 'O campo email é obrigatório.' })
  @IsEmail({}, { message: 'O email informado não é válido.' })
  @IsUnique('users', 'email')
  email: string;

  @ApiProperty({
    description: 'Número de celular com DDD (obrigatório)',
    example: '11987654321',
    type: String,
  })
  @IsNotEmpty({ message: 'O campo celular é obrigatório.' })
  @IsString()
  cel: string;

  @ApiProperty({
    description: 'CPF (11 dígitos) ou CNPJ (14 dígitos) válido',
    example: '52998224725',
    type: String,
  })
  @IsNotEmpty({ message: 'O documento (CPF ou CNPJ) é obrigatório.' })
  @IsString()
  @IsCpfOrCnpj()
  cpfCnpj: string;

  @ApiProperty({
    description: 'Senha do cliente (mínimo 8 caracteres)',
    example: 'senhaSegura123',
    type: String,
    minLength: 8,
  })
  @IsNotEmpty({ message: 'O campo senha é obrigatório.' })
  @IsString()
  @MinLength(8, { message: 'A senha deve ter no mínimo 8 caracteres.' })
  password: string;

  @ApiProperty({
    description: 'Confirmação da senha (deve ser idêntica)',
    example: 'senhaSegura123',
    type: String,
  })
  @IsNotEmpty({ message: 'O campo confirmar a senha é obrigatório.' })
  @IsString()
  @Match('password', { message: 'As senhas não conferem.' })
  password_confirmation: string;

  @ApiPropertyOptional({
    description:
      'ID do plano a ser associado ao cliente. Se não informado, será null (cliente sem plano).',
    example: 1,
    type: Number,
  })
  @IsOptional()
  @IsNumber({}, { message: 'O plan_id deve ser um número.' })
  plan_id?: number;

  @ApiPropertyOptional({
    description:
      'Perfil do cliente: "user" (padrão) ou "administrator". Administradores podem criar outros administradores.',
    example: 'user',
    enum: UserProfile,
    enumName: 'UserProfile',
    default: UserProfile.USER,
  })
  @IsOptional()
  @IsEnum(UserProfile, {
    message:
      'O campo profile deve ser "user" ou "administrator". Valores aceitos: user, administrator',
  })
  profile?: UserProfile;
}
