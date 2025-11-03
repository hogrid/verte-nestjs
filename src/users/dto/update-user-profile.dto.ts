import {
  IsEmail,
  IsString,
  MinLength,
  IsOptional,
} from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';
import { Match } from '../../common/decorators/match.decorator';
import { IsUnique } from '../../common/validators/is-unique.validator';

/**
 * Update User Profile DTO
 * Validates POST /api/v1/user/:id request body (authenticated user updating own profile)
 * All fields are optional for partial updates
 * Users can only update their own basic profile information
 * Cannot change: profile, plan_id, cpfCnpj, status, etc.
 */
export class UpdateUserProfileDto {
  @ApiPropertyOptional({
    description: 'Nome do usuário',
    example: 'João Silva',
    type: String,
  })
  @IsOptional()
  @IsString()
  name?: string;

  @ApiPropertyOptional({
    description: 'Sobrenome do usuário',
    example: 'Santos',
    type: String,
  })
  @IsOptional()
  @IsString()
  last_name?: string;

  @ApiPropertyOptional({
    description: 'Email do usuário (deve ser único)',
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
    description: 'Nova senha (mínimo 8 caracteres). Se fornecida, password_confirmation é obrigatório',
    example: 'novaSenha123',
    type: String,
    minLength: 8,
  })
  @IsOptional()
  @IsString()
  @MinLength(8, { message: 'A senha deve ter no mínimo 8 caracteres.' })
  password?: string;

  @ApiPropertyOptional({
    description: 'Confirmação da nova senha (deve ser idêntica à senha)',
    example: 'novaSenha123',
    type: String,
  })
  @IsOptional()
  @IsString()
  @Match('password', { message: 'As senhas não conferem.' })
  password_confirmation?: string;

  @ApiPropertyOptional({
    description: 'URL ou path da foto de perfil',
    example: '/uploads/profiles/user123.jpg',
    type: String,
  })
  @IsOptional()
  @IsString()
  photo?: string;
}
