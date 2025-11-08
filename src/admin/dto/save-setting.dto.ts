import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsString, IsEnum } from 'class-validator';

/**
 * SaveSettingDto
 *
 * DTO para salvar configuração global do sistema (admin only)
 */
export class SaveSettingDto {
  @ApiProperty({
    description: 'Chave da configuração',
    example: 'max_campaigns_per_user',
    type: String,
    required: true,
  })
  @IsNotEmpty({ message: 'O campo key é obrigatório.' })
  @IsString({ message: 'O campo key deve ser uma string.' })
  key: string;

  @ApiProperty({
    description: 'Valor da configuração',
    example: '10',
    type: String,
    required: true,
  })
  @IsNotEmpty({ message: 'O campo value é obrigatório.' })
  @IsString({ message: 'O campo value deve ser uma string.' })
  value: string;

  @ApiProperty({
    description: 'Tipo de dado da configuração',
    example: 'integer',
    enum: ['string', 'integer', 'boolean', 'json'],
    required: true,
  })
  @IsNotEmpty({ message: 'O campo type é obrigatório.' })
  @IsEnum(['string', 'integer', 'boolean', 'json'], {
    message: 'O campo type deve ser: string, integer, boolean ou json.',
  })
  type: string;
}
