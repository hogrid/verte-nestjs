import { IsEmail, IsNotEmpty, IsString } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

/**
 * Login DTO
 * Validates POST /api/v1/login request body
 * Compatible with Laravel AuthController@login validation
 */
export class LoginDto {
  @ApiProperty({
    description: 'Email do usuário',
    example: 'usuario@exemplo.com',
    type: String,
  })
  @IsNotEmpty({ message: 'O campo email é obrigatório.' })
  @IsEmail({}, { message: 'O email informado não é válido.' })
  email: string;

  @ApiProperty({
    description: 'Senha do usuário',
    example: 'senha123',
    type: String,
    minLength: 6,
  })
  @IsNotEmpty({ message: 'O campo senha é obrigatório.' })
  @IsString()
  password: string;
}
