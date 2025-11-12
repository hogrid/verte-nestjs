import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsString, IsNotEmpty, IsOptional } from 'class-validator';

/**
 * CreateNumberDto
 *
 * DTO para criação de número/instância WhatsApp
 */
export class CreateNumberDto {
  @ApiProperty({
    description: 'Nome do número/instância',
    example: 'WhatsApp Principal',
    type: String,
  })
  @IsOptional()
  @IsString({ message: 'O nome deve ser uma string.' })
  name?: string;

  @ApiProperty({
    description: 'Nome da instância (identificador único)',
    example: 'instance_123456',
    type: String,
  })
  @IsNotEmpty({ message: 'A instância é obrigatória.' })
  @IsString({ message: 'A instância deve ser uma string.' })
  instance: string;

  @ApiPropertyOptional({
    description: 'Número de celular',
    example: '5511999999999',
    type: String,
  })
  @IsOptional()
  @IsString({ message: 'O celular deve ser uma string.' })
  cel?: string;

  @ApiPropertyOptional({
    description: 'Número de telefone (alternativo)',
    example: '5511999999999',
    type: String,
  })
  @IsOptional()
  @IsString({ message: 'O telefone deve ser uma string.' })
  phone?: string;
}
