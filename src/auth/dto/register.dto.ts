import {
  IsEmail,
  IsNotEmpty,
  IsString,
  MinLength,
  IsOptional,
  IsEnum,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Match } from '../../common/decorators/match.decorator';
import { IsUnique } from '../../common/validators/is-unique.validator';
import { IsCpfOrCnpj } from '../../common/validators/is-cpf-or-cnpj.validator';
import { UserProfile } from '../../database/entities/user.entity';

/**
 * Register DTO
 * Validates POST /api/v1/register request body
 * Compatible with Laravel UserService@addUser validation
 *
 * Campos setados automaticamente pelo sistema (NÃO devem ser enviados):
 * - status: 'actived' (usuário criado como ativo)
 * - confirmed_mail: 1 (email considerado confirmado)
 * - active: 0 (aguardando ativação/pagamento)
 * - plan_id: null (será definido quando usuário escolher um plano)
 * - email_verified_at: null
 * - created_at, updated_at: timestamps automáticos
 *
 * Além disso, o sistema cria automaticamente:
 * - Uma instância WhatsApp (Number) com nome baseado no celular
 */
export class RegisterDto {
  @ApiProperty({
    description: 'Nome do usuário (obrigatório)',
    example: 'João',
    type: String,
    required: true,
  })
  @IsNotEmpty({ message: 'O campo nome é obrigatório.' })
  @IsString()
  name: string;

  @ApiPropertyOptional({
    description: 'Sobrenome do usuário (opcional)',
    example: 'Silva',
    type: String,
    required: false,
  })
  @IsOptional()
  @IsString()
  last_name?: string;

  @ApiProperty({
    description:
      'Email do usuário (obrigatório e deve ser único no sistema). Será validado se já existe no banco de dados.',
    example: 'joao.silva@exemplo.com',
    type: String,
    required: true,
  })
  @IsNotEmpty({ message: 'O campo email é obrigatório.' })
  @IsEmail({}, { message: 'O email informado não é válido.' })
  @IsUnique('users', 'email')
  email: string;

  @ApiProperty({
    description:
      'Número de celular com DDD (obrigatório). Será usado para gerar a instância WhatsApp. Formato: apenas números (ex: 11987654321)',
    example: '11987654321',
    type: String,
    required: true,
  })
  @IsNotEmpty({ message: 'O campo celular é obrigatório.' })
  @IsString()
  cel: string;

  @ApiProperty({
    description:
      'CPF (11 dígitos) ou CNPJ (14 dígitos) do usuário (obrigatório). Deve ser um documento válido.',
    example: '52998224725',
    type: String,
    required: true,
  })
  @IsNotEmpty({ message: 'O documento (CPF ou CNPJ) é obrigatória.' })
  @IsString()
  @IsCpfOrCnpj()
  cpfCnpj: string;

  @ApiProperty({
    description:
      'Senha do usuário (obrigatório). Deve ter no mínimo 8 caracteres. Será armazenada de forma criptografada (bcrypt).',
    example: 'senhaSegura123',
    type: String,
    minLength: 8,
    required: true,
  })
  @IsNotEmpty({ message: 'O campo senha é obrigatório.' })
  @IsString()
  @MinLength(8, { message: 'A senha deve ter no mínimo 8 caracteres.' })
  password: string;

  @ApiProperty({
    description:
      'Confirmação da senha (obrigatório). Deve ser idêntica ao campo "password".',
    example: 'senhaSegura123',
    type: String,
    required: true,
  })
  @IsNotEmpty({ message: 'O campo confirmar a senha é obrigatório.' })
  @IsString()
  @Match('password', { message: 'As senhas não conferem.' })
  password_confirmation: string;

  @ApiPropertyOptional({
    description:
      'Perfil de permissão do usuário. Valores aceitos: "user" (padrão, usuário comum) ou "administrator" (administrador do sistema). Se não informado, será criado como "user".',
    example: 'user',
    enum: UserProfile,
    enumName: 'UserProfile',
    default: UserProfile.USER,
  })
  @IsOptional()
  @IsEnum(UserProfile, {
    message:
      'O campo permission deve ser "user" ou "administrator". Valores aceitos: user, administrator',
  })
  permission?: UserProfile;
}
