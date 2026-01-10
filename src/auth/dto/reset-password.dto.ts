import { IsEmail, IsString, MinLength, IsOptional } from 'class-validator';

export class ForgotPasswordDto {
  @IsEmail({}, { message: 'O campo email deve ser um email válido.' })
  email: string;
}

export class ResetPasswordDto {
  @IsString({ message: 'O campo token deve ser uma string.' })
  token: string;

  @IsEmail({}, { message: 'O campo email deve ser um email válido.' })
  email: string;

  @IsString({ message: 'O campo password deve ser uma string.' })
  @MinLength(6, {
    message: 'O campo password deve ter no mínimo 6 caracteres.',
  })
  password: string;

  @IsString({ message: 'O campo password_confirmation deve ser uma string.' })
  @MinLength(6, {
    message: 'O campo password_confirmation deve ter no mínimo 6 caracteres.',
  })
  password_confirmation: string;
}

export class ChangePasswordDto {
  @IsString({ message: 'O campo current_password deve ser uma string.' })
  current_password: string;

  @IsString({ message: 'O campo password deve ser uma string.' })
  @MinLength(6, {
    message: 'O campo password deve ter no mínimo 6 caracteres.',
  })
  password: string;

  @IsString({ message: 'O campo password_confirmation deve ser uma string.' })
  @MinLength(6, {
    message: 'O campo password_confirmation deve ter no mínimo 6 caracteres.',
  })
  password_confirmation: string;
}
