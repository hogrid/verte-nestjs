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
  @IsNotEmpty({ message: 'A etapa é obrigatório.' })
  @IsNumber({}, { message: 'A etapa deve ser um número.' })
  @Min(0)
  @Max(2)
  step: number;

  @IsNotEmpty({ message: 'O campo email é obrigatório.' })
  @IsEmail({}, { message: 'O email informado não é válido.' })
  email: string;

  @IsOptional()
  @IsString()
  pin?: string;

  @IsOptional()
  @IsString()
  @MinLength(8, { message: 'A senha deve ter no mínimo 8 caracteres.' })
  password?: string;

  @IsOptional()
  @IsString()
  @Match('password', { message: 'As senhas não conferem.' })
  password_confirmation?: string;
}
