import { IsEmail, IsNotEmpty, IsString } from 'class-validator';

/**
 * Login DTO
 * Validates POST /api/v1/login request body
 * Compatible with Laravel AuthController@login validation
 */
export class LoginDto {
  @IsNotEmpty({ message: 'O campo email é obrigatório.' })
  @IsEmail({}, { message: 'O email informado não é válido.' })
  email: string;

  @IsNotEmpty({ message: 'O campo senha é obrigatório.' })
  @IsString()
  password: string;
}
