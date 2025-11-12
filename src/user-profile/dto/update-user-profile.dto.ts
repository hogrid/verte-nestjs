import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsString, IsEmail, MinLength } from 'class-validator';

export class UpdateUserProfileDto {
  @ApiPropertyOptional({
    description: 'Nome do usuário',
    example: 'João',
  })
  @IsOptional()
  @IsString()
  name?: string;

  @ApiPropertyOptional({
    description: 'Sobrenome do usuário',
    example: 'Silva',
  })
  @IsOptional()
  @IsString()
  last_name?: string;

  @ApiPropertyOptional({
    description: 'Email do usuário',
    example: 'joao@email.com',
  })
  @IsOptional()
  @IsEmail()
  email?: string;

  @ApiPropertyOptional({
    description: 'Celular do usuário',
    example: '11999999999',
  })
  @IsOptional()
  @IsString()
  cel?: string;

  @ApiPropertyOptional({ description: 'Nova senha', example: 'senha123456' })
  @IsOptional()
  @IsString()
  password?: string;

  @ApiPropertyOptional({
    description: 'Confirmação de senha',
    example: 'senha123456',
  })
  @IsOptional()
  @IsString()
  password_confirmation?: string;
}
