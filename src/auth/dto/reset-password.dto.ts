import {
  IsEmail,
  IsNotEmpty,
  IsString,
  IsNumber,
  MinLength,
  IsOptional,
  Min,
  Max,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Match } from '../../common/decorators/match.decorator';

/**
 * Reset Password DTO (Multi-step process)
 * Validates POST /api/v1/reset request body
 * Compatible with Laravel AuthController@send_forget_password
 *
 * Step 0: Send verification code to email
 * Step 1: Verify PIN code
 * Step 2: Reset password with PIN
 */
export class ResetPasswordDto {
  @ApiProperty({
    description:
      'Etapa do processo de reset: 0 (solicitar código), 1 (verificar código), 2 (redefinir senha)',
    example: 0,
    type: Number,
    minimum: 0,
    maximum: 2,
    enum: [0, 1, 2],
  })
  @IsNotEmpty({ message: 'A etapa é obrigatório.' })
  @IsNumber({}, { message: 'A etapa deve ser um número.' })
  @Min(0)
  @Max(2)
  step: number;

  @ApiProperty({
    description: 'Email do usuário que deseja resetar a senha',
    example: 'usuario@exemplo.com',
    type: String,
  })
  @IsNotEmpty({ message: 'O campo email é obrigatório.' })
  @IsEmail({}, { message: 'O email informado não é válido.' })
  email: string;

  @ApiPropertyOptional({
    description: 'Código PIN de 6 dígitos enviado por email (steps 1 e 2)',
    example: '123456',
    type: String,
    minLength: 6,
    maxLength: 6,
  })
  @IsOptional()
  @IsString()
  pin?: string;

  @ApiPropertyOptional({
    description: 'Nova senha do usuário (step 2)',
    example: 'novaSenha123',
    type: String,
    minLength: 8,
  })
  @IsOptional()
  @IsString()
  @MinLength(8, { message: 'A senha deve ter no mínimo 8 caracteres.' })
  password?: string;

  @ApiPropertyOptional({
    description: 'Confirmação da nova senha (step 2)',
    example: 'novaSenha123',
    type: String,
  })
  @IsOptional()
  @IsString()
  @Match('password', { message: 'As senhas não conferem.' })
  password_confirmation?: string;
}
