import { IsEmail, IsString, MinLength } from 'class-validator';

export class LoginDto {
  @IsEmail({}, { message: 'O campo email deve ser um email válido.' })
  email: string;

  @IsString({ message: 'O campo password deve ser uma string.' })
  @MinLength(6, { message: 'O campo password deve ter no mínimo 6 caracteres.' })
  password: string;
}
