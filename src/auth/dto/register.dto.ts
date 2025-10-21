import {
  IsEmail,
  IsNotEmpty,
  IsString,
  MinLength,
  IsOptional,
} from 'class-validator';
import { Match } from '../../common/decorators/match.decorator';
import { IsUnique } from '../../common/validators/is-unique.validator';
import { IsCpfOrCnpj } from '../../common/validators/is-cpf-or-cnpj.validator';

/**
 * Register DTO
 * Validates POST /api/v1/register request body
 * Compatible with Laravel UserService@addUser validation
 */
export class RegisterDto {
  @IsNotEmpty({ message: 'O campo nome é obrigatório.' })
  @IsString()
  name: string;

  @IsOptional()
  @IsString()
  last_name?: string;

  @IsNotEmpty({ message: 'O campo email é obrigatório.' })
  @IsEmail({}, { message: 'O email informado não é válido.' })
  @IsUnique('users', 'email')
  email: string;

  @IsNotEmpty({ message: 'O campo celular é obrigatório.' })
  @IsString()
  cel: string;

  @IsNotEmpty({ message: 'O documento (CPF ou CNPJ) é obrigatória.' })
  @IsString()
  @IsCpfOrCnpj()
  cpfCnpj: string;

  @IsNotEmpty({ message: 'O campo senha é obrigatório.' })
  @IsString()
  @MinLength(8, { message: 'A senha deve ter no mínimo 8 caracteres.' })
  password: string;

  @IsNotEmpty({ message: 'O campo confirmar a senha é obrigatório.' })
  @IsString()
  @Match('password', { message: 'As senhas não conferem.' })
  password_confirmation: string;

  @IsOptional()
  @IsString()
  permission?: string;
}
