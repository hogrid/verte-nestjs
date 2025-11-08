import { ApiProperty } from '@nestjs/swagger';
import {
  IsNotEmpty,
  IsString,
  IsArray,
  IsInt,
  Min,
  ArrayMinSize,
} from 'class-validator';

/**
 * Send Poll DTO
 * Laravel: WhatsappController@sendPoll
 */
export class SendPollDto {
  @ApiProperty({
    description: 'Nome/título da enquete',
    example: 'Qual sua preferência?',
    type: String,
    required: true,
  })
  @IsNotEmpty({ message: 'O campo name é obrigatório.' })
  @IsString({ message: 'O campo name deve ser uma string.' })
  name: string;

  @ApiProperty({
    description: 'Opções da enquete (mínimo 2)',
    example: ['Opção 1', 'Opção 2', 'Opção 3'],
    type: [String],
    required: true,
  })
  @IsNotEmpty({ message: 'O campo options é obrigatório.' })
  @IsArray({ message: 'O campo options deve ser um array.' })
  @ArrayMinSize(2, { message: 'O campo options deve ter no mínimo 2 opções.' })
  options: string[];

  @ApiProperty({
    description: 'Quantidade de opções selecionáveis',
    example: 1,
    type: Number,
    required: true,
    minimum: 1,
  })
  @IsNotEmpty({ message: 'O campo selectableCount é obrigatório.' })
  @IsInt({ message: 'O campo selectableCount deve ser um número inteiro.' })
  @Min(1, { message: 'O campo selectableCount deve ser no mínimo 1.' })
  selectableCount: number;

  @ApiProperty({
    description: 'Número do destinatário (formato WhatsApp)',
    example: '5511999999999@c.us',
    type: String,
    required: true,
  })
  @IsNotEmpty({ message: 'O campo number é obrigatório.' })
  @IsString({ message: 'O campo number deve ser uma string.' })
  number: string;
}
