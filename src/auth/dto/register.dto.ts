import {
  IsEmail,
  IsString,
  MinLength,
  IsOptional,
  IsNumber,
  Matches,
} from 'class-validator';

export class RegisterDto {
  @IsString({ message: 'O campo name deve ser uma string.' })
  name: string;

  @IsString({ message: 'O campo last_name deve ser uma string.' })
  @IsOptional()
  last_name?: string;

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

  @IsString({ message: 'O campo cel deve ser uma string.' })
  @IsOptional()
  cel?: string;

  @IsString({ message: 'O campo cpfCnpj deve ser uma string.' })
  @IsOptional()
  cpfCnpj?: string;

  @IsNumber({}, { message: 'O campo plan_id deve ser um número.' })
  @IsOptional()
  plan_id?: number;
}
