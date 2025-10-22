import {
  IsEmail,
  IsNotEmpty,
  IsString,
  MinLength,
  IsOptional,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Match } from '../../common/decorators/match.decorator';
import { IsUnique } from '../../common/validators/is-unique.validator';
import { IsCpfOrCnpj } from '../../common/validators/is-cpf-or-cnpj.validator';

/**
 * Register DTO
 * Validates POST /api/v1/register request body
 * Compatible with Laravel UserService@addUser validation
 */
export class RegisterDto {
  @ApiProperty({
    description: 'Nome do usuário',
    example: 'João',
    type: String,
  })
  @IsNotEmpty({ message: 'O campo nome é obrigatório.' })
  @IsString()
  name: string;

  @ApiPropertyOptional({
    description: 'Sobrenome do usuário',
    example: 'Silva',
    type: String,
  })
  @IsOptional()
  @IsString()
  last_name?: string;

  @ApiProperty({
    description: 'Email do usuário (deve ser único)',
    example: 'joao.silva@exemplo.com',
    type: String,
  })
  @IsNotEmpty({ message: 'O campo email é obrigatório.' })
  @IsEmail({}, { message: 'O email informado não é válido.' })
  @IsUnique('users', 'email')
  email: string;

  @ApiProperty({
    description: 'Número de celular com DDD',
    example: '11987654321',
    type: String,
  })
  @IsNotEmpty({ message: 'O campo celular é obrigatório.' })
  @IsString()
  cel: string;

  @ApiProperty({
    description: 'CPF (11 dígitos) ou CNPJ (14 dígitos) do usuário',
    example: '52998224725',
    type: String,
  })
  @IsNotEmpty({ message: 'O documento (CPF ou CNPJ) é obrigatória.' })
  @IsString()
  @IsCpfOrCnpj()
  cpfCnpj: string;

  @ApiProperty({
    description: 'Senha do usuário',
    example: 'senhaSegura123',
    type: String,
    minLength: 8,
  })
  @IsNotEmpty({ message: 'O campo senha é obrigatório.' })
  @IsString()
  @MinLength(8, { message: 'A senha deve ter no mínimo 8 caracteres.' })
  password: string;

  @ApiProperty({
    description: 'Confirmação da senha (deve ser igual ao campo password)',
    example: 'senhaSegura123',
    type: String,
  })
  @IsNotEmpty({ message: 'O campo confirmar a senha é obrigatório.' })
  @IsString()
  @Match('password', { message: 'As senhas não conferem.' })
  password_confirmation: string;

  @ApiPropertyOptional({
    description: 'Permissão do usuário (admin ou user)',
    example: 'user',
    enum: ['admin', 'user'],
    default: 'user',
  })
  @IsOptional()
  @IsString()
  permission?: string;
}
